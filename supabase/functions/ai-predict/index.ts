import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { type, data } = await req.json();

    if (type === "zone_predictions") {
      // Fetch zones and recent incident counts
      const { data: zones } = await supabase.from("zones").select("*");
      const { data: recentIncidents } = await supabase
        .from("incidents")
        .select("zone_id, trigger_type, severity, created_at")
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

      const zoneStats = (zones || []).map((z) => {
        const incidents = (recentIncidents || []).filter((i) => i.zone_id === z.id);
        return { zone: z.name, city: z.city, risk_score: z.risk_score, recent_incidents: incidents.length };
      });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a weather risk prediction AI for GigShield, a parametric insurance platform for gig workers in India. Given zone data with risk scores and recent incident history, predict next-week disruption probabilities. Return predictions as JSON.`,
            },
            {
              role: "user",
              content: `Given these zones and their recent data:\n${JSON.stringify(zoneStats)}\n\nPredict next week's disruption probabilities for each major city. Consider monsoon patterns, seasonal AQI trends, and recent incident frequency.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_predictions",
                description: "Return city-level disruption predictions for next week",
                parameters: {
                  type: "object",
                  properties: {
                    predictions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          city: { type: "string" },
                          probability: { type: "number", description: "0-100 disruption probability" },
                          event: { type: "string", description: "Most likely event type" },
                          estimated_claims_inr: { type: "number" },
                          reserve_needed_inr: { type: "number" },
                        },
                        required: ["city", "probability", "event", "estimated_claims_inr", "reserve_needed_inr"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["predictions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_predictions" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiResult = await response.json();
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      const predictions = toolCall ? JSON.parse(toolCall.function.arguments) : { predictions: [] };

      return new Response(JSON.stringify(predictions), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "shield_score_explain") {
      const { worker_name, score, zone, claim_count, platform } = data || {};

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "You are GigShield's AI. Explain a worker's Shield Score in 2-3 simple sentences in a friendly tone. Mention what factors helped or hurt their score.",
            },
            {
              role: "user",
              content: `Worker: ${worker_name}, Score: ${score}/100, Zone: ${zone}, Claims: ${claim_count}, Platform: ${platform}. Explain their score.`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const result = await response.json();
      const explanation = result.choices?.[0]?.message?.content || "Score analysis unavailable.";

      return new Response(JSON.stringify({ explanation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-predict error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
