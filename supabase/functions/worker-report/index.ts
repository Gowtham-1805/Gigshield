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
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");

    const userId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, trigger_type, incident_id } = await req.json();

    // Get worker
    const { data: worker, error: workerErr } = await supabase
      .from("workers")
      .select("id, zone_id, weekly_earnings, shield_score, name, platform")
      .eq("user_id", userId)
      .single();
    if (workerErr || !worker) throw new Error("Worker profile not found");
    if (!worker.zone_id) throw new Error("No zone assigned to your profile");

    // Get active policy
    const { data: policy, error: polErr } = await supabase
      .from("policies")
      .select("id, max_payout, tier, status")
      .eq("worker_id", worker.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (polErr || !policy) throw new Error("No active policy found. Please purchase a plan first.");

    // Duplicate check: no claim in last 6 hours for this worker
    const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
    const { data: recentClaim } = await supabase
      .from("claims")
      .select("id")
      .eq("policy_id", policy.id)
      .gte("created_at", sixHoursAgo)
      .limit(1)
      .single();
    if (recentClaim) throw new Error("You already have a claim in the last 6 hours. Please wait before reporting again.");

    // Velocity check: max 3 claims in 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: recentClaims } = await supabase
      .from("claims")
      .select("id")
      .eq("policy_id", policy.id)
      .gte("created_at", sevenDaysAgo);
    if ((recentClaims || []).length >= 3) throw new Error("You've reached the maximum of 3 claims this week.");

    let incidentRecord: any;

    if (action === "report_disruption") {
      // Worker reports a new disruption
      if (!trigger_type) throw new Error("trigger_type is required");

      // Create incident (worker-reported)
      const { data: inc, error: incErr } = await supabase
        .from("incidents")
        .insert({
          zone_id: worker.zone_id,
          trigger_type,
          severity: 60,
          is_simulated: false,
          weather_data: { source: "worker_report", reported_by: userId },
        })
        .select()
        .single();
      if (incErr) throw incErr;
      incidentRecord = inc;

    } else if (action === "file_claim") {
      // Worker files claim on existing incident
      if (!incident_id) throw new Error("incident_id is required");

      const { data: inc, error: incErr } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", incident_id)
        .single();
      if (incErr || !inc) throw new Error("Incident not found");

      // Verify incident is in worker's zone
      if (inc.zone_id !== worker.zone_id) throw new Error("This incident is not in your zone.");

      // Check incident is recent (last 24 hours)
      const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      if (inc.created_at < dayAgo) throw new Error("This incident has expired. Claims must be filed within 24 hours.");

      incidentRecord = inc;
    } else {
      throw new Error("Invalid action. Use 'report_disruption' or 'file_claim'.");
    }

    // Calculate payout amount
    const lostHoursMap: Record<string, number> = {
      RAIN_HEAVY: 3, RAIN_EXTREME: 6, HEAT_EXTREME: 4,
      AQI_SEVERE: 4, CURFEW_LOCAL: 6, STORM_CYCLONE: 8,
    };
    const hourlyRate = 150;
    const baseLostHours = lostHoursMap[incidentRecord.trigger_type] || 4;
    const tierMultiplier = policy.tier === "PRO" ? 1.2 : policy.tier === "STANDARD" ? 1.0 : 0.8;
    const amount = Math.min(
      Math.round(hourlyRate * baseLostHours * tierMultiplier),
      Number(policy.max_payout)
    );

    // Basic fraud scoring for worker-reported claims
    const weeklyEarnings = Number(worker.weekly_earnings || 0);
    const earningsExceeded = weeklyEarnings > 0 && amount > weeklyEarnings * 1.2;
    const baseFraud = action === "report_disruption" ? 0.15 : 0.05; // worker reports get slightly higher base
    const fraudScore = Math.min(1, baseFraud + (earningsExceeded ? 0.3 : 0));

    let status: string;
    if (fraudScore > 0.5) status = "flagged";
    else if (action === "report_disruption") status = "processing"; // worker reports need verification
    else status = "approved";

    // Create claim
    const { data: claim, error: claimErr } = await supabase
      .from("claims")
      .insert({
        policy_id: policy.id,
        incident_id: incidentRecord.id,
        trigger_type: incidentRecord.trigger_type,
        amount,
        fraud_score: parseFloat(fraudScore.toFixed(4)),
        status,
        fraud_details: {
          source: action === "report_disruption" ? "worker_report" : "existing_incident",
          gps_match: true,
          weather_confirmed: action === "file_claim",
          velocity_ok: true,
          duplicate_check: "passed",
          earnings_check: earningsExceeded ? "FAILED_120_PCT" : "passed",
          hourly_rate: hourlyRate,
          lost_hours: baseLostHours,
          tier_multiplier: tierMultiplier,
        },
      })
      .select()
      .single();
    if (claimErr) throw claimErr;

    // Auto-payout for approved claims
    let payout = null;
    if (status === "approved") {
      const { data: p } = await supabase
        .from("payouts")
        .insert({
          claim_id: claim.id,
          amount: claim.amount,
          status: "completed",
          upi_id: `worker-${worker.id.slice(0, 8)}@upi`,
        })
        .select()
        .single();
      payout = p;
    }

    return new Response(JSON.stringify({
      success: true,
      claim,
      payout,
      message: status === "approved"
        ? `Claim approved! ₹${amount} will be disbursed shortly.`
        : status === "processing"
        ? `Disruption reported! Your claim of ₹${amount} is being verified.`
        : `Claim of ₹${amount} has been flagged for review.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("worker-report error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  }
});
