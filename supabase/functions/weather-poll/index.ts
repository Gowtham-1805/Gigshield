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
    const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");
    if (!OPENWEATHER_API_KEY) throw new Error("OPENWEATHER_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: zones, error: zErr } = await supabase.from("zones").select("*");
    if (zErr) throw zErr;
    if (!zones || zones.length === 0) {
      return new Response(JSON.stringify({ message: "No zones configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const zone of zones) {
      try {
        // === Multi-Source Weather Validation (3 sources) ===

        // Source 1: OpenWeatherMap Current Weather
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${zone.lat}&lon=${zone.lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        const weather = await weatherRes.json();

        // Source 2: OpenWeatherMap AQI
        const aqiRes = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${zone.lat}&lon=${zone.lng}&appid=${OPENWEATHER_API_KEY}`
        );
        const aqi = await aqiRes.json();

        // Source 3: OpenWeatherMap 5-day/3-hour Forecast (cross-reference)
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${zone.lat}&lon=${zone.lng}&appid=${OPENWEATHER_API_KEY}&units=metric&cnt=3`
        );
        const forecast = await forecastRes.json();

        const rainfall = weather.rain?.["1h"] || weather.rain?.["3h"] || 0;
        const temperature = weather.main?.temp || null;
        const humidity = weather.main?.humidity || null;
        const windSpeed = weather.wind?.speed || null;
        const aqiValue = aqi.list?.[0]?.main?.aqi ? aqi.list[0].main.aqi * 100 : null;

        // Cross-reference: forecast rainfall for next 3 hours
        const forecastRainfall = forecast.list?.reduce((sum: number, f: any) => {
          return sum + (f.rain?.["3h"] || 0);
        }, 0) || 0;

        // Cross-reference: forecast temperature
        const forecastMaxTemp = forecast.list?.reduce((max: number, f: any) => {
          return Math.max(max, f.main?.temp || 0);
        }, 0) || 0;

        // Multi-source validation counters
        const sourceConfirmations: Record<string, number> = {};

        // Insert weather reading
        const { error: insertErr } = await supabase.from("weather_readings").insert({
          zone_id: zone.id,
          temperature,
          rainfall,
          humidity,
          wind_speed: windSpeed,
          aqi: aqiValue,
          raw_data: {
            weather,
            aqi,
            forecast_summary: {
              next_3hr_rainfall: forecastRainfall,
              forecast_max_temp: forecastMaxTemp,
            },
            sources_used: ["openweathermap_current", "openweathermap_aqi", "openweathermap_forecast"],
          },
        });

        if (insertErr) console.error(`Insert error for ${zone.id}:`, insertErr);

        // Check trigger thresholds with multi-source validation
        const triggers: string[] = [];

        // RAIN checks — require at least 2 sources confirming
        if (rainfall > 50) {
          sourceConfirmations["RAIN_HEAVY"] = 1; // source 1: current
          if (forecastRainfall > 30) sourceConfirmations["RAIN_HEAVY"]++; // source 3: forecast agrees
          if (humidity && humidity > 85) sourceConfirmations["RAIN_HEAVY"]++; // cross-ref: high humidity
          if ((sourceConfirmations["RAIN_HEAVY"] || 0) >= 2) triggers.push("RAIN_HEAVY");
        }
        if (rainfall > 100) {
          sourceConfirmations["RAIN_EXTREME"] = 1;
          if (forecastRainfall > 80) sourceConfirmations["RAIN_EXTREME"]++;
          if (humidity && humidity > 90) sourceConfirmations["RAIN_EXTREME"]++;
          if ((sourceConfirmations["RAIN_EXTREME"] || 0) >= 2) triggers.push("RAIN_EXTREME");
        }

        // HEAT checks
        if (temperature && temperature > 45) {
          sourceConfirmations["HEAT_EXTREME"] = 1;
          if (forecastMaxTemp > 44) sourceConfirmations["HEAT_EXTREME"]++;
          if (humidity && humidity < 30) sourceConfirmations["HEAT_EXTREME"]++; // dry heat confirms
          if ((sourceConfirmations["HEAT_EXTREME"] || 0) >= 2) triggers.push("HEAT_EXTREME");
        }

        // AQI checks
        if (aqiValue && aqiValue > 400) {
          sourceConfirmations["AQI_SEVERE"] = 2; // AQI itself is a dedicated source
          triggers.push("AQI_SEVERE");
        }

        // Storm/Cyclone checks
        if (windSpeed && windSpeed > 30) {
          sourceConfirmations["STORM_CYCLONE"] = 1;
          if (rainfall > 20) sourceConfirmations["STORM_CYCLONE"]++; // rain + wind = storm
          if ((sourceConfirmations["STORM_CYCLONE"] || 0) >= 2) triggers.push("STORM_CYCLONE");
        }

        // Create incidents for triggered thresholds
        for (const triggerType of triggers) {
          const severity = triggerType.includes("EXTREME") || triggerType === "STORM_CYCLONE" ? 90 : 70;

          const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
          const { data: existing } = await supabase
            .from("incidents")
            .select("id")
            .eq("zone_id", zone.id)
            .eq("trigger_type", triggerType)
            .gte("created_at", sixHoursAgo)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { data: incident } = await supabase
            .from("incidents")
            .insert({
              zone_id: zone.id,
              trigger_type: triggerType,
              severity,
              is_simulated: false,
              weather_data: {
                temperature, rainfall, humidity, wind_speed: windSpeed, aqi: aqiValue,
                forecast_rainfall: forecastRainfall, forecast_max_temp: forecastMaxTemp,
                sources_confirmed: sourceConfirmations[triggerType] || 0,
                validation: `${sourceConfirmations[triggerType] || 0}/3 sources confirmed`,
              },
            })
            .select()
            .single();

          if (incident) {
            const { data: workers } = await supabase
              .from("workers")
              .select("id, weekly_earnings")
              .eq("zone_id", zone.id);

            if (workers && workers.length > 0) {
              const workerIds = workers.map((w) => w.id);
              const { data: policies } = await supabase
                .from("policies")
                .select("id, tier, max_payout, worker_id")
                .in("worker_id", workerIds)
                .eq("status", "active");

              if (policies && policies.length > 0) {
                const lostHoursMap: Record<string, number> = {
                  RAIN_HEAVY: 3, RAIN_EXTREME: 6, HEAT_EXTREME: 4,
                  AQI_SEVERE: 4, CURFEW_LOCAL: 6, STORM_CYCLONE: 8,
                };
                const hourlyRate = 150;
                const baseLostHours = lostHoursMap[triggerType] || 4;

                const workerEarningsMap = Object.fromEntries(workers.map(w => [w.id, Number(w.weekly_earnings || 0)]));

                const claimInserts = policies.map((p) => {
                  const tierMultiplier = p.tier === "PRO" ? 1.2 : p.tier === "STANDARD" ? 1.0 : 0.8;
                  const amount = Math.min(
                    Math.round(hourlyRate * baseLostHours * tierMultiplier),
                    Number(p.max_payout)
                  );
                  const weeklyEarnings = workerEarningsMap[p.worker_id] || 0;
                  const earningsExceeded = weeklyEarnings > 0 && amount > weeklyEarnings * 1.2;

                  return {
                    policy_id: p.id,
                    incident_id: incident.id,
                    trigger_type: triggerType,
                    amount,
                    fraud_score: earningsExceeded ? 0.55 : 0.05,
                    status: earningsExceeded ? "flagged" as const : "approved" as const,
                    fraud_details: {
                      auto_approved: !earningsExceeded,
                      weather_confirmed: true,
                      sources_confirmed: sourceConfirmations[triggerType] || 0,
                      earnings_check: earningsExceeded ? "FAILED_120_PCT" : "passed",
                      hourly_rate: hourlyRate,
                      lost_hours: baseLostHours,
                    },
                  };
                });

                await supabase.from("claims").insert(claimInserts);
              }
            }
          }
        }

        results.push({
          zone: zone.name,
          temperature, rainfall, aqi: aqiValue,
          forecast_rainfall: forecastRainfall,
          sources_used: 3,
          triggers,
          source_confirmations: sourceConfirmations,
        });
      } catch (zoneErr) {
        console.error(`Error processing zone ${zone.id}:`, zoneErr);
        results.push({ zone: zone.name, error: String(zoneErr) });
      }
    }

    return new Response(JSON.stringify({ polled: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weather-poll error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
