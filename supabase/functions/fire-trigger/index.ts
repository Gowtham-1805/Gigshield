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
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create user-scoped client for role check
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Use service role for data operations
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check admin role
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
      .select("id")
      .eq("zone_id", zone_id);

    if (!workers || workers.length === 0) {
      return new Response(JSON.stringify({
        incident,
        claims_created: 0,
        payouts_created: 0,
        message: "No workers in this zone",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const workerIds = workers.map((w) => w.id);
    const { data: policies } = await supabase
      .from("policies")
      .select("id, worker_id, max_payout, tier")
      .in("worker_id", workerIds)
      .eq("status", "active");

    if (!policies || policies.length === 0) {
      return new Response(JSON.stringify({
        incident,
        claims_created: 0,
        payouts_created: 0,
        message: "No active policies in this zone",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 3: Duplicate claim prevention — skip workers who already have claims for this zone in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
    const policyIds = policies.map((p) => p.id);
    const { data: existingClaims } = await supabase
      .from("claims")
      .select("policy_id")
      .in("policy_id", policyIds)
      .gte("created_at", sixHoursAgo);

    const alreadyClaimedPolicyIds = new Set((existingClaims || []).map((c) => c.policy_id));

    // Step 3b: Velocity check — skip workers with 3+ claims in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: recentClaimsAll } = await supabase
      .from("claims")
      .select("policy_id")
      .in("policy_id", policyIds)
      .gte("created_at", sevenDaysAgo);

    const claimCountByPolicy: Record<string, number> = {};
    (recentClaimsAll || []).forEach((c) => {
      claimCountByPolicy[c.policy_id] = (claimCountByPolicy[c.policy_id] || 0) + 1;
    });

    // Hourly payout model: ₹150/hr × estimated lost hours based on trigger type
    const lostHoursMap: Record<string, number> = {
      RAIN_HEAVY: 3,      // 2+ hrs disruption → 3 hrs lost
      RAIN_EXTREME: 6,    // Full day
      HEAT_EXTREME: 4,    // 3+ hrs extreme → 4 hrs lost
      AQI_SEVERE: 4,      // Half-day
      CURFEW_LOCAL: 6,    // Full day
      STORM_CYCLONE: 8,   // Full day + aftermath
    };
    const hourlyRate = 150; // ₹150/hr
    const baseLostHours = lostHoursMap[trigger_type] || 4;

    // Step 3c: Create claims with fraud scoring
    const eligiblePolicies = policies.filter((p) => {
      if (alreadyClaimedPolicyIds.has(p.id)) return false; // Duplicate prevention
      if ((claimCountByPolicy[p.id] || 0) >= 3) return false; // Velocity check
      return true;
    });

    const claimInserts = eligiblePolicies.map((p) => {
      const fraudScore = Math.random() * 0.3; // Low fraud for demo
      const tierMultiplier = p.tier === "PRO" ? 1.2 : p.tier === "STANDARD" ? 1.0 : 0.8;
      const amount = Math.min(
        Math.round(hourlyRate * baseLostHours * tierMultiplier),
        Number(p.max_payout)
      );
      const velocityOk = (claimCountByPolicy[p.id] || 0) < 3;
      return {
        policy_id: p.id,
        incident_id: incident.id,
        trigger_type,
        amount,
        fraud_score: parseFloat(fraudScore.toFixed(4)),
        status: fraudScore > 0.5 ? "flagged" : "approved",
        fraud_details: {
          gps_match: true,
          weather_confirmed: true,
          velocity_ok: velocityOk,
          duplicate_check: "passed",
          anomaly_score: fraudScore,
          hourly_rate: hourlyRate,
          lost_hours: baseLostHours,
          tier_multiplier: tierMultiplier,
        },
      };
    });

    const { data: claims, error: claimErr } = await supabase
      .from("claims")
      .insert(claimInserts)
      .select();
    if (claimErr) throw claimErr;

    // Step 4: Create payouts for approved claims
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

    // Step 5: Update worker shield scores
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
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("fire-trigger error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
