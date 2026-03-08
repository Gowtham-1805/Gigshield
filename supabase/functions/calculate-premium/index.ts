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
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { worker_id, zone_id } = await req.json();
    if (!worker_id || !zone_id) throw new Error("worker_id and zone_id required");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch worker data, zone risk, and claim history
    const [workerRes, zoneRes, claimsRes] = await Promise.all([
      supabase.from("workers").select("*").eq("id", worker_id).single(),
      supabase.from("zones").select("*").eq("id", zone_id).single(),
      supabase.from("claims").select("id, amount, status, created_at")
        .eq("policy_id", worker_id) // approximate - will be improved
        .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString()),
    ]);

    const worker = workerRes.data;
    const zone = zoneRes.data;

    // Calculate base premium factors
    const baseRates = { BASIC: 39, STANDARD: 64, PRO: 99 };
    const zoneRiskMultiplier = zone ? 0.7 + zone.risk_score * 0.6 : 1.0; // 0.7x - 1.3x
    
    // Season factor (monsoon = higher)
    const month = new Date().getMonth();
    const seasonMultiplier = [6, 7, 8, 9].includes(month) ? 1.25 : [10, 11].includes(month) ? 1.1 : 1.0;

    // Claim history factor
    const recentClaims = claimsRes.data?.length || 0;
    const claimHistoryMultiplier = recentClaims > 5 ? 1.3 : recentClaims > 2 ? 1.15 : recentClaims === 0 ? 0.9 : 1.0;

    const premiums: Record<string, number> = {};
    for (const [tier, base] of Object.entries(baseRates)) {
      premiums[tier] = Math.round(base * zoneRiskMultiplier * seasonMultiplier * claimHistoryMultiplier);
    }

    // AI recommendation
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
            content: "You are GigShield's AI insurance advisor. Given worker and zone data, recommend the best plan tier and explain why in 2-3 sentences. Be friendly, use simple language.",
          },
          {
            role: "user",
            content: `Worker: ${worker?.name}, Platform: ${worker?.platform}, City: ${worker?.city}, Zone: ${zone?.name} (risk score: ${zone?.risk_score}), Shield Score: ${worker?.shield_score}/100, Recent claims: ${recentClaims}, Weekly earnings: ₹${worker?.weekly_earnings}. Calculated premiums: BASIC ₹${premiums.BASIC}/wk, STANDARD ₹${premiums.STANDARD}/wk, PRO ₹${premiums.PRO}/wk. Which plan do you recommend?`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_plan",
              description: "Return a plan recommendation",
              parameters: {
                type: "object",
                properties: {
                  recommended_tier: { type: "string", enum: ["BASIC", "STANDARD", "PRO"] },
                  reason: { type: "string", description: "2-3 sentence explanation" },
                  savings_tip: { type: "string", description: "One tip to lower premiums" },
                },
                required: ["recommended_tier", "reason", "savings_tip"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    const recommendation = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    // Update shield score based on factors
    const newScore = Math.min(100, Math.max(0,
      50
      + (recentClaims === 0 ? 20 : -recentClaims * 3)
      + (zone && zone.risk_score < 0.5 ? 15 : -5)
      + Math.floor(Math.random() * 10)
    ));

    await supabase.from("workers").update({ shield_score: newScore }).eq("id", worker_id);

    return new Response(JSON.stringify({
      premiums,
      factors: {
        zone_risk: zoneRiskMultiplier.toFixed(2),
        season: seasonMultiplier.toFixed(2),
        claim_history: claimHistoryMultiplier.toFixed(2),
      },
      recommendation,
      shield_score: newScore,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calculate-premium error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
