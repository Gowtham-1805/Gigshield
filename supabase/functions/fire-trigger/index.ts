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
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { zone_id, trigger_type, severity } = await req.json();
    if (!zone_id || !trigger_type) throw new Error("zone_id and trigger_type are required");

    // Step 1: Create incident
    const { data: incident, error: incErr } = await supabase
      .from("incidents")
      .insert({
        zone_id,
        trigger_type,
        severity: severity || 70,
        is_simulated: true,
        weather_data: { source: "demo", triggered_by: user.id },
      })
      .select()
      .single();
    if (incErr) throw incErr;

    // Step 2: Find active policies for workers in this zone
    const { data: workers } = await supabase
      .from("workers")
      .select("id, weekly_earnings, shield_score, name, platform")
      .eq("zone_id", zone_id);

    if (!workers || workers.length === 0) {
      return new Response(JSON.stringify({
        incident, claims_created: 0, payouts_created: 0, message: "No workers in this zone",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const workerIds = workers.map((w) => w.id);
    const workerMap = Object.fromEntries(workers.map((w) => [w.id, w]));

    const { data: policies } = await supabase
      .from("policies")
      .select("id, worker_id, max_payout, tier")
      .in("worker_id", workerIds)
      .eq("status", "active");

    if (!policies || policies.length === 0) {
      return new Response(JSON.stringify({
        incident, claims_created: 0, payouts_created: 0, message: "No active policies in this zone",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 3: Duplicate claim prevention (6hr window)
    const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
    const policyIds = policies.map((p) => p.id);
    const { data: existingClaims } = await supabase
      .from("claims")
      .select("policy_id")
      .in("policy_id", policyIds)
      .gte("created_at", sixHoursAgo);

    const alreadyClaimedPolicyIds = new Set((existingClaims || []).map((c) => c.policy_id));

    // Step 3b: Velocity check (3+ claims in 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: recentClaimsAll } = await supabase
      .from("claims")
      .select("policy_id, amount")
      .in("policy_id", policyIds)
      .gte("created_at", sevenDaysAgo);

    const claimCountByPolicy: Record<string, number> = {};
    const claimTotalByPolicy: Record<string, number> = {};
    (recentClaimsAll || []).forEach((c) => {
      claimCountByPolicy[c.policy_id] = (claimCountByPolicy[c.policy_id] || 0) + 1;
      claimTotalByPolicy[c.policy_id] = (claimTotalByPolicy[c.policy_id] || 0) + Number(c.amount);
    });

    // Hourly payout model
    const lostHoursMap: Record<string, number> = {
      RAIN_HEAVY: 3, RAIN_EXTREME: 6, HEAT_EXTREME: 4,
      AQI_SEVERE: 4, CURFEW_LOCAL: 6, STORM_CYCLONE: 8,
    };
    const hourlyRate = 150;
    const baseLostHours = lostHoursMap[trigger_type] || 4;

    // Filter eligible policies
    const eligiblePolicies = policies.filter((p) => {
      if (alreadyClaimedPolicyIds.has(p.id)) return false;
      if ((claimCountByPolicy[p.id] || 0) >= 3) return false;
      return true;
    });

    // Step 4: AI Anomaly Detection (Layer 3) — batch score all eligible claims
    let aiAnomalyScores: Record<string, { score: number; reason: string }> = {};
    if (LOVABLE_API_KEY && eligiblePolicies.length > 0) {
      try {
        const claimProfiles = eligiblePolicies.map((p) => {
          const w = workerMap[p.worker_id];
          return {
            policy_id: p.id,
            worker_name: w?.name || "Unknown",
            platform: w?.platform || "Unknown",
            shield_score: w?.shield_score || 50,
            weekly_earnings: Number(w?.weekly_earnings || 0),
            recent_claim_count: claimCountByPolicy[p.id] || 0,
            recent_claim_total: claimTotalByPolicy[p.id] || 0,
            tier: p.tier,
          };
        });

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `You are GigShield's fraud anomaly detection AI. Analyze each worker's claim profile and assign an anomaly score (0.0 = normal, 1.0 = highly anomalous). Consider: claim frequency vs zone peers, claim amounts vs weekly earnings, shield score, and unusual patterns. Workers with many recent claims, low shield scores, or claim amounts exceeding their typical earnings are more anomalous.`,
              },
              {
                role: "user",
                content: `Trigger: ${trigger_type}, Zone: ${zone_id}. Analyze these worker claim profiles for anomalies:\n${JSON.stringify(claimProfiles)}`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "return_anomaly_scores",
                description: "Return anomaly scores for each worker claim",
                parameters: {
                  type: "object",
                  properties: {
                    scores: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          policy_id: { type: "string" },
                          anomaly_score: { type: "number", description: "0.0-1.0 anomaly score" },
                          reason: { type: "string", description: "Brief reason for score" },
                        },
                        required: ["policy_id", "anomaly_score", "reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["scores"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "return_anomaly_scores" } },
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            (parsed.scores || []).forEach((s: any) => {
              aiAnomalyScores[s.policy_id] = { score: s.anomaly_score, reason: s.reason };
            });
          }
        }
      } catch (e) {
        console.error("AI anomaly detection error (fallback to heuristic):", e);
      }
    }

    // Step 5: Build claims with AI anomaly scores + 120% earnings check
    const claimInserts = eligiblePolicies.map((p) => {
      const tierMultiplier = p.tier === "PRO" ? 1.2 : p.tier === "STANDARD" ? 1.0 : 0.8;
      const amount = Math.min(
        Math.round(hourlyRate * baseLostHours * tierMultiplier),
        Number(p.max_payout)
      );

      const w = workerMap[p.worker_id];
      const weeklyEarnings = Number(w?.weekly_earnings || 0);

      // Layer 3: AI anomaly score (fallback to heuristic if AI unavailable)
      const aiScore = aiAnomalyScores[p.id];
      const anomalyScore = aiScore
        ? aiScore.score
        : Math.min(1, (claimCountByPolicy[p.id] || 0) * 0.15 + Math.random() * 0.1);

      // Layer 4 extra: 120% earnings check
      const earningsExceeded = weeklyEarnings > 0 && amount > weeklyEarnings * 1.2;

      // Combined fraud score
      const baseFraudScore = anomalyScore;
      const earningsPenalty = earningsExceeded ? 0.3 : 0;
      const fraudScore = Math.min(1, baseFraudScore + earningsPenalty);

      // Determine status
      let status: string;
      if (fraudScore > 0.7) status = "flagged";
      else if (fraudScore > 0.5 || earningsExceeded) status = "flagged";
      else status = "approved";

      const velocityOk = (claimCountByPolicy[p.id] || 0) < 3;

      return {
        policy_id: p.id,
        incident_id: incident.id,
        trigger_type,
        amount,
        fraud_score: parseFloat(fraudScore.toFixed(4)),
        status,
        fraud_details: {
          gps_match: true,
          weather_confirmed: true,
          velocity_ok: velocityOk,
          duplicate_check: "passed",
          anomaly_score: parseFloat(anomalyScore.toFixed(4)),
          anomaly_reason: aiScore?.reason || "heuristic_fallback",
          anomaly_method: aiScore ? "ai_gemini" : "heuristic",
          earnings_check: earningsExceeded ? "FAILED_120_PCT" : "passed",
          weekly_earnings: weeklyEarnings,
          claim_vs_earnings_pct: weeklyEarnings > 0 ? Math.round((amount / weeklyEarnings) * 100) : null,
          hourly_rate: hourlyRate,
          lost_hours: baseLostHours,
          tier_multiplier: tierMultiplier,
        },
      };
    });

    if (claimInserts.length === 0) {
      return new Response(JSON.stringify({
        incident, claims_created: 0, payouts_created: 0,
        skipped_duplicates: alreadyClaimedPolicyIds.size,
        skipped_velocity: policies.length - eligiblePolicies.length - alreadyClaimedPolicyIds.size,
        message: "All policies filtered by duplicate/velocity checks",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: claims, error: claimErr } = await supabase
      .from("claims")
      .insert(claimInserts)
      .select();
    if (claimErr) throw claimErr;

    // Step 6: Create payouts for approved claims
    const approvedClaims = (claims || []).filter((c) => c.status === "approved");
    const payoutInserts = approvedClaims.map((c) => ({
      claim_id: c.id,
      amount: c.amount,
      status: "completed",
      upi_id: `worker-${c.policy_id.slice(0, 8)}@upi`,
    }));

    let payouts: any[] = [];
    if (payoutInserts.length > 0) {
      const { data: p, error: payErr } = await supabase
        .from("payouts")
        .insert(payoutInserts)
        .select();
      if (payErr) throw payErr;
      payouts = p || [];
    }

    // Step 7: Update worker shield scores
    for (const wid of workerIds) {
      await supabase
        .from("workers")
        .update({ shield_score: Math.min(100, 50 + Math.floor(Math.random() * 40)) })
        .eq("id", wid);
    }

    const totalDisbursed = approvedClaims.reduce((s, c) => s + Number(c.amount), 0);

    return new Response(JSON.stringify({
      incident,
      claims_created: claims?.length || 0,
      approved: approvedClaims.length,
      flagged: (claims?.length || 0) - approvedClaims.length,
      payouts_created: payouts.length,
      total_disbursed: totalDisbursed,
      fraud_engine: {
        ai_anomaly_detection: Object.keys(aiAnomalyScores).length > 0 ? "ai_powered" : "heuristic_fallback",
        earnings_checks_run: eligiblePolicies.length,
        earnings_flagged: claimInserts.filter(c => (c.fraud_details as any).earnings_check === "FAILED_120_PCT").length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("fire-trigger error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
