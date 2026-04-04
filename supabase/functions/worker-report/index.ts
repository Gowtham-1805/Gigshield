import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GPS_RADIUS_KM = 10;

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

    const body = await req.json();
    const { action, trigger_type, incident_id, lat, lng, device_fingerprint } = body;

    // Get worker
    const { data: worker, error: workerErr } = await supabase
      .from("workers")
      .select("id, zone_id, weekly_earnings, shield_score, name, platform, last_lat, last_lng")
      .eq("user_id", userId)
      .single();
    if (workerErr || !worker) throw new Error("Worker profile not found");

    // Update GPS if provided
    if (lat && lng) {
      await supabase.from("workers").update({
        last_lat: lat,
        last_lng: lng,
        last_location_at: new Date().toISOString(),
      }).eq("id", worker.id);
      worker.last_lat = lat;
      worker.last_lng = lng;
    }

    // Determine the effective zone: use GPS to find nearest zone if worker has location
    const workerLat = worker.last_lat || null;
    const workerLng = worker.last_lng || null;

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
    let gpsMethod = "registered_zone";
    let gpsDistance = 0;

    if (action === "report_disruption") {
      if (!trigger_type) throw new Error("trigger_type is required");

      // Use GPS zone if available, otherwise registered zone
      let effectiveZoneId = worker.zone_id;
      if (workerLat && workerLng) {
        const { data: zones } = await supabase.from("zones").select("id, lat, lng, name").limit(100);
        if (zones) {
          let nearest = null;
          let nearestDist = Infinity;
          for (const z of zones) {
            const d = haversineKm(workerLat, workerLng, z.lat, z.lng);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = z;
            }
          }
          if (nearest && nearestDist <= GPS_RADIUS_KM) {
            effectiveZoneId = nearest.id;
            gpsMethod = "gps_nearest_zone";
            gpsDistance = nearestDist;
          }
        }
      }

      if (!effectiveZoneId) throw new Error("No zone assigned and no GPS location available.");

      const { data: inc, error: incErr } = await supabase
        .from("incidents")
        .insert({
          zone_id: effectiveZoneId,
          trigger_type,
          severity: 60,
          is_simulated: false,
          weather_data: {
            source: "worker_report",
            reported_by: userId,
            gps_lat: workerLat,
            gps_lng: workerLng,
            gps_method: gpsMethod,
          },
        })
        .select()
        .single();
      if (incErr) throw incErr;
      incidentRecord = inc;

    } else if (action === "file_claim") {
      if (!incident_id) throw new Error("incident_id is required");

      const { data: inc, error: incErr } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", incident_id)
        .single();
      if (incErr || !inc) throw new Error("Incident not found");

      // GPS-based zone matching: check if worker is near the incident zone
      let isInZone = inc.zone_id === worker.zone_id; // registered zone match
      if (!isInZone && workerLat && workerLng) {
        const { data: incZone } = await supabase.from("zones").select("lat, lng").eq("id", inc.zone_id).single();
        if (incZone) {
          gpsDistance = haversineKm(workerLat, workerLng, incZone.lat, incZone.lng);
          if (gpsDistance <= GPS_RADIUS_KM) {
            isInZone = true;
            gpsMethod = "gps_proximity";
          }
        }
      }

      if (!isInZone) {
        throw new Error("This incident is not in your zone and you're not GPS-nearby. Share your location to claim in other zones.");
      }

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

    // Fraud scoring
    const weeklyEarnings = Number(worker.weekly_earnings || 0);
    const earningsExceeded = weeklyEarnings > 0 && amount > weeklyEarnings * 1.2;
    const baseFraud = action === "report_disruption" ? 0.15 : 0.05;
    const gpsPenalty = gpsMethod === "gps_proximity" ? Math.min(0.1, gpsDistance * 0.01) : 0;
    const fraudScore = Math.min(1, baseFraud + (earningsExceeded ? 0.3 : 0) + gpsPenalty);

    let status: string;
    if (fraudScore > 0.5) status = "flagged";
    else if (action === "report_disruption") status = "processing";
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
          gps_method: gpsMethod,
          gps_distance_km: parseFloat(gpsDistance.toFixed(2)),
          gps_radius_km: GPS_RADIUS_KM,
          gps_lat: workerLat,
          gps_lng: workerLng,
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

    // Run anti-spoofing analysis asynchronously
    const antiSpoofUrl = `${supabaseUrl}/functions/v1/anti-spoof`;
    const antiSpoofUrl = `${supabaseUrl}/functions/v1/anti-spoof`;
    fetch(antiSpoofUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ claim_id: claim.id, worker_id: worker.id, device_fingerprint }),
    }).catch(e => console.error("anti-spoof fire-and-forget error:", e));

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
      gps_info: {
        method: gpsMethod,
        distance_km: parseFloat(gpsDistance.toFixed(2)),
        worker_location: workerLat && workerLng ? { lat: workerLat, lng: workerLng } : null,
      },
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
});
