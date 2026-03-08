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

    if (type === "zone_detailed_forecast") {
      const { city } = data || {};
      
      // Fetch zones — filter by worker's city if provided
      let zonesQuery = supabase.from("zones").select("*");
      if (city) {
        zonesQuery = zonesQuery.ilike("city", city);
      }
      const { data: zones } = await zonesQuery;
      
      const zoneIds = (zones || []).map((z) => z.id);
      
      const { data: weatherReadings } = await supabase
        .from("weather_readings")
        .select("zone_id, temperature, rainfall, humidity, wind_speed, aqi, recorded_at")
        .in("zone_id", zoneIds)
        .order("recorded_at", { ascending: false })
        .limit(100);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: recentIncidents } = await supabase
        .from("incidents")
        .select("zone_id, trigger_type, severity, created_at")
        .in("zone_id", zoneIds)
        .gte("created_at", thirtyDaysAgo);

      const { data: recentClaims } = await supabase
        .from("claims")
        .select("amount, status, trigger_type, created_at")
        .gte("created_at", thirtyDaysAgo);

      const zoneDetails = (zones || []).map((z) => {
        const weather = (weatherReadings || []).filter((w) => w.zone_id === z.id).slice(0, 5);
        const incidents = (recentIncidents || []).filter((i) => i.zone_id === z.id);
        return {
          id: z.id, name: z.name, city: z.city, risk_score: z.risk_score,
          lat: z.lat, lng: z.lng,
          recent_weather: weather.map(w => ({
            temp: w.temperature, rain: w.rainfall, humidity: w.humidity,
            wind: w.wind_speed, aqi: w.aqi, at: w.recorded_at,
          })),
          incidents_30d: incidents.length,
          incident_types: [...new Set(incidents.map(i => i.trigger_type))],
          avg_severity: incidents.length > 0 ? Math.round(incidents.reduce((s, i) => s + i.severity, 0) / incidents.length) : 0,
        };
      });

      const validZoneIds = new Set((zones || []).map(z => z.id));
      const validZoneNames = (zones || []).map(z => z.name);
      const totalClaims30d = (recentClaims || []).length;
      const totalClaimAmount = (recentClaims || []).reduce((s, c) => s + Number(c.amount), 0);
      const cityLabel = city || "all cities";
      const avgClaimAmount = totalClaims30d > 0 ? Math.round(totalClaimAmount / totalClaims30d) : 300;

      // Fetch active policies to understand tier distribution and realistic payout caps
      const { data: activePolicies } = await supabase
        .from("policies")
        .select("tier, max_payout, premium")
        .eq("status", "active");

      const tierCounts = { BASIC: 0, STANDARD: 0, PRO: 0 };
      const tierMaxPayouts = { BASIC: 500, STANDARD: 1000, PRO: 1500 };
      (activePolicies || []).forEach((p: any) => {
        if (p.tier in tierCounts) tierCounts[p.tier as keyof typeof tierCounts]++;
      });
      const totalActivePolicies = Object.values(tierCounts).reduce((a, b) => a + b, 0);
      const weightedAvgPayout = totalActivePolicies > 0
        ? Math.round(
            (tierCounts.BASIC * tierMaxPayouts.BASIC +
             tierCounts.STANDARD * tierMaxPayouts.STANDARD +
             tierCounts.PRO * tierMaxPayouts.PRO) / totalActivePolicies
          )
        : 400;

      // Realistic per-zone weekly claim estimate: weighted avg payout × ~20-40% trigger probability
      const realisticPerZoneClaim = Math.round(weightedAvgPayout * 0.3);
      const maxPerZoneClaim = weightedAvgPayout; // Hard cap = one full weighted avg payout

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
              content: `You are GigShield's weather risk AI. You MUST ONLY produce forecasts for the exact zones provided in the input data. Do NOT invent or add zones that are not in the input. The valid zones are: ${validZoneNames.join(", ")}. Consider seasonal patterns for Indian cities (monsoon Jun-Sep, winter fog Dec-Jan, summer heat Mar-May, AQI spikes Oct-Nov). The platform_summary MUST only discuss ${cityLabel}.

IMPORTANT - Estimated claims per zone MUST be realistic and LOW:
- GigShield is a micro-insurance platform with weekly premiums of ₹29-₹129.
- Policy tiers: BASIC (max payout ~₹500), STANDARD (~₹1000), PRO (~₹1500).
- Current active policy distribution: BASIC=${tierCounts.BASIC}, STANDARD=${tierCounts.STANDARD}, PRO=${tierCounts.PRO}.
- Weighted average max payout per worker: ₹${weightedAvgPayout}.
- Realistic estimated_claims_inr per zone per week: ₹${Math.round(realisticPerZoneClaim * 0.5)}-₹${realisticPerZoneClaim} for low-moderate risk, up to ₹${maxPerZoneClaim} ONLY for critical risk zones.
- NEVER exceed ₹${maxPerZoneClaim} per zone. Most zones should be ₹100-₹${realisticPerZoneClaim}.`,
            },
            {
              role: "user",
              content: `Analyze ONLY these ${cityLabel} zones (do NOT add any other zones):\n${JSON.stringify(zoneDetails)}\n\nRecent claims in this region: ${totalClaims30d} claims totaling ₹${totalClaimAmount}. Average claim amount: ₹${avgClaimAmount}.\n\nProvide 7-day disruption forecasts ONLY for the zones listed above. Keep estimated_claims_inr realistic and proportional to the micro-insurance premiums (₹29-₹129/week).`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_zone_forecasts",
                description: "Return detailed per-zone 7-day risk forecasts",
                parameters: {
                  type: "object",
                  properties: {
                    forecasts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          zone_id: { type: "string" },
                          zone_name: { type: "string" },
                          city: { type: "string" },
                          overall_risk: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                          risk_score: { type: "number", description: "0-100" },
                          primary_threat: { type: "string" },
                          secondary_threat: { type: "string" },
                          peak_risk_day: { type: "string", description: "Day of week with highest risk" },
                          estimated_affected_workers: { type: "number" },
                          estimated_claims_inr: { type: "number" },
                          ai_summary: { type: "string", description: "2-3 sentence forecast narrative" },
                          daily_risk: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                day: { type: "string" },
                                risk_level: { type: "number", description: "0-100" },
                                event: { type: "string" },
                              },
                              required: ["day", "risk_level", "event"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["zone_id", "zone_name", "city", "overall_risk", "risk_score", "primary_threat", "ai_summary", "daily_risk"],
                        additionalProperties: false,
                      },
                    },
                    platform_summary: {
                      type: "string",
                      description: "Overall platform risk summary for next week",
                    },
                  },
                  required: ["forecasts", "platform_summary"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_zone_forecasts" } },
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
      const rawResult = toolCall ? JSON.parse(toolCall.function.arguments) : { forecasts: [], platform_summary: "" };

      // Post-filter: only keep forecasts for valid zone IDs that exist in DB
      const filteredForecasts = (rawResult.forecasts || []).filter(
        (f: any) => validZoneIds.has(f.zone_id)
      ).map((f: any) => ({
        ...f,
        // Cap estimated claims to realistic range based on policy tier distribution
        estimated_claims_inr: Math.min(f.estimated_claims_inr || 0, maxPerZoneClaim),
      }));

      return new Response(JSON.stringify({
        forecasts: filteredForecasts,
        platform_summary: rawResult.platform_summary || "",
      }), {
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
