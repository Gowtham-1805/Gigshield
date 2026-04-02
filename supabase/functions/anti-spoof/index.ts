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

// Shield Score trust tiers
function getTrustTier(shieldScore: number): { tier: string; softHoldHours: number; autoApproveThreshold: number } {
  if (shieldScore >= 85) return { tier: 'platinum', softHoldHours: 0, autoApproveThreshold: 0.7 };
  if (shieldScore >= 70) return { tier: 'gold', softHoldHours: 2, autoApproveThreshold: 0.5 };
  if (shieldScore >= 50) return { tier: 'standard', softHoldHours: 6, autoApproveThreshold: 0.3 };
  return { tier: 'probation', softHoldHours: 24, autoApproveThreshold: 0.15 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { claim_id, worker_id, device_fingerprint } = await req.json();
    if (!claim_id || !worker_id) throw new Error("claim_id and worker_id required");

    // Fetch claim, worker, and related data
    const [claimRes, workerRes] = await Promise.all([
      supabase.from("claims").select("*").eq("id", claim_id).single(),
      supabase.from("workers").select("*").eq("id", worker_id).single(),
    ]);
    if (claimRes.error || !claimRes.data) throw new Error("Claim not found");
    if (workerRes.error || !workerRes.data) throw new Error("Worker not found");

    const claim = claimRes.data;
    const worker = workerRes.data;
    const fraudSignals: Array<{ signal_type: string; severity: string; score: number; details: any }> = [];

    // ── 1. MULTI-SIGNAL LOCATION TRIANGULATION ──
    let gpsConfidence = 0.5;
    let triangulationScore = 0.5;
    let deviceIntegrityScore = 0.8;

    // Store device fingerprint if provided
    if (device_fingerprint) {
      await supabase.from("device_fingerprints").insert({
        worker_id,
        device_hash: device_fingerprint.device_hash || "unknown",
        ip_address: device_fingerprint.ip_address,
        user_agent: device_fingerprint.user_agent,
        screen_resolution: device_fingerprint.screen_resolution,
        timezone: device_fingerprint.timezone,
        language: device_fingerprint.language,
        platform: device_fingerprint.platform,
        has_touch: device_fingerprint.has_touch,
        has_accelerometer: device_fingerprint.has_accelerometer,
        canvas_hash: device_fingerprint.canvas_hash,
        wifi_bssid: device_fingerprint.wifi_bssid,
        cell_tower_id: device_fingerprint.cell_tower_id,
        signals: device_fingerprint.signals || {},
      });

      // Check for GPS spoofing app indicators
      const signals = device_fingerprint.signals || {};
      if (signals.mock_location_enabled) {
        deviceIntegrityScore = 0.1;
        fraudSignals.push({
          signal_type: "gps_spoofing_app",
          severity: "critical",
          score: 0.95,
          details: { reason: "Mock location provider detected on device" },
        });
      }

      // Check accelerometer data (stationary user claiming outdoor activity)
      if (device_fingerprint.has_accelerometer === false) {
        deviceIntegrityScore *= 0.7;
        fraudSignals.push({
          signal_type: "no_accelerometer",
          severity: "medium",
          score: 0.4,
          details: { reason: "Device lacks motion sensors - cannot verify physical movement" },
        });
      }

      if (signals.accelerometer_variance !== undefined) {
        const variance = signals.accelerometer_variance;
        if (variance < 0.01) {
          // Perfectly still - suspicious for someone claiming to be stranded outdoors
          fraudSignals.push({
            signal_type: "stationary_device",
            severity: "medium",
            score: 0.5,
            details: { variance, reason: "Device shows no movement - inconsistent with outdoor activity" },
          });
          gpsConfidence *= 0.6;
        }
      }

      // Cross-reference device fingerprint with previous submissions
      const { data: prevFingerprints } = await supabase
        .from("device_fingerprints")
        .select("*")
        .eq("device_hash", device_fingerprint.device_hash)
        .neq("worker_id", worker_id)
        .limit(5);

      if (prevFingerprints && prevFingerprints.length > 0) {
        // Same device used by multiple workers = potential fraud ring
        fraudSignals.push({
          signal_type: "shared_device",
          severity: "high",
          score: 0.8,
          details: {
            other_worker_count: prevFingerprints.length,
            reason: `Device used by ${prevFingerprints.length} other worker(s)`,
          },
        });
        deviceIntegrityScore *= 0.3;
      }

      // IP geolocation vs GPS consistency check
      if (device_fingerprint.ip_address && worker.last_lat && worker.last_lng) {
        // Check timezone vs expected timezone for GPS location
        const expectedTz = getExpectedTimezone(worker.last_lat, worker.last_lng);
        if (device_fingerprint.timezone && device_fingerprint.timezone !== expectedTz) {
          triangulationScore *= 0.6;
          fraudSignals.push({
            signal_type: "timezone_mismatch",
            severity: "medium",
            score: 0.45,
            details: { expected: expectedTz, actual: device_fingerprint.timezone },
          });
        }
      }
    }

    // GPS consistency check: compare reported location with zone
    const fraudDetails = (claim.fraud_details || {}) as Record<string, any>;
    if (fraudDetails.gps_lat && fraudDetails.gps_lng && worker.zone_id) {
      const { data: zone } = await supabase.from("zones").select("lat, lng").eq("id", worker.zone_id).single();
      if (zone) {
        const dist = haversineKm(fraudDetails.gps_lat, fraudDetails.gps_lng, zone.lat, zone.lng);
        gpsConfidence = dist <= 5 ? 0.9 : dist <= 10 ? 0.6 : dist <= 20 ? 0.3 : 0.1;
        if (dist > 15) {
          fraudSignals.push({
            signal_type: "gps_zone_mismatch",
            severity: "high",
            score: Math.min(0.9, dist * 0.03),
            details: { distance_km: parseFloat(dist.toFixed(2)), zone_id: worker.zone_id },
          });
        }
      }
    }

    // ── 2. TEMPORAL CLUSTERING DETECTION ──
    let temporalClusterFlag = false;
    const thirtyMinAgo = new Date(Date.now() - 30 * 60000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();

    // Check for claim surge in same zone within 30 minutes
    if (claim.incident_id) {
      const { data: incident } = await supabase.from("incidents").select("zone_id").eq("id", claim.incident_id).single();
      if (incident) {
        const { data: recentZoneClaims } = await supabase
          .from("claims")
          .select("id, created_at, policy_id")
          .gte("created_at", thirtyMinAgo)
          .limit(100);

        // Get worker IDs for these claims to check zone
        if (recentZoneClaims && recentZoneClaims.length >= 10) {
          // High volume in short window - potential coordinated attack
          temporalClusterFlag = true;
          fraudSignals.push({
            signal_type: "temporal_cluster",
            severity: "high",
            score: Math.min(0.9, recentZoneClaims.length * 0.05),
            details: {
              claims_in_30min: recentZoneClaims.length,
              zone_id: incident.zone_id,
              reason: `${recentZoneClaims.length} claims in 30-minute window suggests coordinated activity`,
            },
          });
        }

        // Check claim timing distribution (organic weather events produce gradual curves)
        const { data: hourClaims } = await supabase
          .from("claims")
          .select("created_at")
          .gte("created_at", twoHoursAgo)
          .order("created_at", { ascending: true });

        if (hourClaims && hourClaims.length >= 5) {
          const timestamps = hourClaims.map(c => new Date(c.created_at).getTime());
          const intervals: number[] = [];
          for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
          }
          // If intervals are suspiciously uniform (bot-like), flag it
          if (intervals.length > 3) {
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
            const cv = Math.sqrt(variance) / mean; // coefficient of variation
            if (cv < 0.15 && mean < 60000) {
              // Very uniform timing with short intervals
              temporalClusterFlag = true;
              fraudSignals.push({
                signal_type: "uniform_timing",
                severity: "critical",
                score: 0.85,
                details: {
                  coefficient_of_variation: parseFloat(cv.toFixed(4)),
                  mean_interval_ms: Math.round(mean),
                  reason: "Claim timestamps show bot-like uniform distribution",
                },
              });
            }
          }
        }
      }
    }

    // ── 3. NETWORK / RING DETECTION ──
    let networkRingFlag = false;

    // Check if this worker shares payment/UPI patterns with flagged workers
    const { data: workerClaims } = await supabase
      .from("claims")
      .select("id, fraud_score, fraud_details, policy_id")
      .gte("fraud_score", 0.5)
      .limit(50);

    if (workerClaims) {
      // Find workers who claim in synchronized patterns
      const { data: workerPolicies } = await supabase
        .from("policies")
        .select("id, worker_id")
        .eq("worker_id", worker_id);

      const workerPolicyIds = new Set((workerPolicies || []).map(p => p.id));

      // Check if flagged claims share patterns with this worker's claims
      const coClaimWorkers = new Map<string, number>();
      for (const fc of workerClaims) {
        if (workerPolicyIds.has(fc.policy_id)) continue; // skip own claims
        const fcDetails = (fc.fraud_details || {}) as Record<string, any>;
        // Check for shared device, UPI, or IP patterns
        if (device_fingerprint && fcDetails.device_hash === device_fingerprint.device_hash) {
          coClaimWorkers.set(fc.policy_id, (coClaimWorkers.get(fc.policy_id) || 0) + 1);
        }
      }

      if (coClaimWorkers.size >= 2) {
        networkRingFlag = true;
        fraudSignals.push({
          signal_type: "network_collusion",
          severity: "critical",
          score: 0.9,
          details: {
            connected_policies: coClaimWorkers.size,
            reason: `Worker connected to ${coClaimWorkers.size} other flagged policies via shared signals`,
          },
        });
      }
    }

    // ── 4. BEHAVIORAL SCORING ──
    let behavioralScore = 0.7; // default neutral
    
    // Check claim frequency anomaly
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: monthClaims } = await supabase
      .from("claims")
      .select("id")
      .in("policy_id", (await supabase.from("policies").select("id").eq("worker_id", worker_id)).data?.map(p => p.id) || [])
      .gte("created_at", thirtyDaysAgo);

    const monthlyFrequency = (monthClaims || []).length;
    if (monthlyFrequency > 8) {
      behavioralScore *= 0.4;
      fraudSignals.push({
        signal_type: "high_claim_frequency",
        severity: "medium",
        score: 0.6,
        details: { claims_30_days: monthlyFrequency, reason: `${monthlyFrequency} claims in 30 days is abnormally high` },
      });
    }

    // ── 5. COMPUTE OVERALL SPOOF PROBABILITY ──
    const weights = { gps: 0.25, triangulation: 0.2, device: 0.2, behavioral: 0.15, temporal: 0.1, network: 0.1 };
    const overallSpoof = 1 - (
      gpsConfidence * weights.gps +
      triangulationScore * weights.triangulation +
      deviceIntegrityScore * weights.device +
      behavioralScore * weights.behavioral +
      (temporalClusterFlag ? 0 : 1) * weights.temporal +
      (networkRingFlag ? 0 : 1) * weights.network
    );

    // ── 6. SHIELD SCORE TRUST TIER & SOFT HOLD ──
    const trustTier = getTrustTier(worker.shield_score);
    let verificationStatus = "cleared";
    let softHoldExpiresAt: string | null = null;

    if (overallSpoof > trustTier.autoApproveThreshold) {
      if (overallSpoof > 0.7) {
        verificationStatus = "flagged";
      } else {
        verificationStatus = "soft_hold";
        softHoldExpiresAt = new Date(Date.now() + trustTier.softHoldHours * 3600000).toISOString();
      }
    }

    // ── 7. PERSIST RESULTS ──
    // Store fraud signals
    if (fraudSignals.length > 0) {
      await supabase.from("fraud_signals").insert(
        fraudSignals.map(s => ({ ...s, claim_id, worker_id }))
      );
    }

    // Store analysis
    const { data: analysis } = await supabase.from("spoofing_analysis").insert({
      claim_id,
      worker_id,
      gps_confidence: parseFloat(gpsConfidence.toFixed(4)),
      triangulation_score: parseFloat(triangulationScore.toFixed(4)),
      behavioral_score: parseFloat(behavioralScore.toFixed(4)),
      device_integrity_score: parseFloat(deviceIntegrityScore.toFixed(4)),
      temporal_cluster_flag: temporalClusterFlag,
      network_ring_flag: networkRingFlag,
      overall_spoof_probability: parseFloat(overallSpoof.toFixed(4)),
      verification_status: verificationStatus,
      soft_hold_expires_at: softHoldExpiresAt,
      trust_tier: trustTier.tier,
      analysis_details: {
        weights,
        signals_count: fraudSignals.length,
        shield_score: worker.shield_score,
        auto_approve_threshold: trustTier.autoApproveThreshold,
      },
    }).select().single();

    // Update claim status if needed
    if (verificationStatus === "soft_hold") {
      await supabase.from("claims").update({ status: "soft_hold" as any }).eq("id", claim_id);
    } else if (verificationStatus === "flagged" && claim.status !== "flagged") {
      await supabase.from("claims").update({ status: "flagged" }).eq("id", claim_id);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        gps_confidence: gpsConfidence,
        triangulation_score: triangulationScore,
        device_integrity_score: deviceIntegrityScore,
        behavioral_score: behavioralScore,
        temporal_cluster_flag: temporalClusterFlag,
        network_ring_flag: networkRingFlag,
        overall_spoof_probability: overallSpoof,
        verification_status: verificationStatus,
        trust_tier: trustTier.tier,
        soft_hold_expires_at: softHoldExpiresAt,
        signals: fraudSignals,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("anti-spoof error:", e);
    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Simple timezone inference from longitude
function getExpectedTimezone(lat: number, lng: number): string {
  if (lng >= 68 && lng <= 97) return "Asia/Kolkata";
  if (lng >= -5 && lng <= 3) return "Europe/London";
  if (lng >= -130 && lng <= -60) return "America/New_York";
  return "UTC";
}
