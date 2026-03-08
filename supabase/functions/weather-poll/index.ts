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

    // Fetch all zones
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
        // OpenWeatherMap Current Weather
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${zone.lat}&lon=${zone.lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        const weather = await weatherRes.json();

        // AQI from OpenWeatherMap
        const aqiRes = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${zone.lat}&lon=${zone.lng}&appid=${OPENWEATHER_API_KEY}`
        );
        const aqi = await aqiRes.json();

        const rainfall = weather.rain?.["1h"] || weather.rain?.["3h"] || 0;
        const temperature = weather.main?.temp || null;
        const humidity = weather.main?.humidity || null;
        const windSpeed = weather.wind?.speed || null;
        const aqiValue = aqi.list?.[0]?.main?.aqi ? aqi.list[0].main.aqi * 100 : null; // Scale 1-5 → rough AQI

        // Insert weather reading
        const { error: insertErr } = await supabase.from("weather_readings").insert({
          zone_id: zone.id,
          temperature,
          rainfall,
          humidity,
          wind_speed: windSpeed,
          aqi: aqiValue,
          raw_data: { weather, aqi },
        });

        if (insertErr) console.error(`Insert error for ${zone.id}:`, insertErr);

        // Check trigger thresholds
        const triggers: string[] = [];
        if (rainfall > 50) triggers.push("RAIN_HEAVY");
        if (rainfall > 100) triggers.push("RAIN_EXTREME");
        if (temperature && temperature > 45) triggers.push("HEAT_EXTREME");
        if (aqiValue && aqiValue > 400) triggers.push("AQI_SEVERE");
        if (windSpeed && windSpeed > 30) triggers.push("STORM_CYCLONE");

        // Create incidents for triggered thresholds
        for (const triggerType of triggers) {
          const severity = triggerType.includes("EXTREME") || triggerType === "STORM_CYCLONE" ? 90 : 70;

          // Check if an incident already exists in the last 6 hours for same zone/trigger
          const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
          const { data: existing } = await supabase
            .from("incidents")
            .select("id")
            .eq("zone_id", zone.id)
            .eq("trigger_type", triggerType)
            .gte("created_at", sixHoursAgo)
            .limit(1);

          if (existing && existing.length > 0) continue; // Skip duplicate

          const { data: incident } = await supabase
            .from("incidents")
            .insert({
              zone_id: zone.id,
              trigger_type: triggerType,
              severity,
              is_simulated: false,
              weather_data: { temperature, rainfall, humidity, wind_speed: windSpeed, aqi: aqiValue },
            })
            .select()
            .single();

          if (incident) {
            // Auto-create claims for active workers in zone
            const { data: workers } = await supabase
              .from("workers")
              .select("id")
              .eq("zone_id", zone.id);

            if (workers && workers.length > 0) {
              const workerIds = workers.map((w) => w.id);
              const { data: policies } = await supabase
                .from("policies")
                .select("id, tier, max_payout")
                .in("worker_id", workerIds)
                .eq("status", "active");

              if (policies && policies.length > 0) {
                const claimInserts = policies.map((p) => ({
                  policy_id: p.id,
                  incident_id: incident.id,
                  trigger_type: triggerType,
                  amount: p.tier === "PRO" ? 600 : p.tier === "STANDARD" ? 450 : 300,
                  fraud_score: 0.05,
                  status: "approved" as const,
                  fraud_details: { auto_approved: true, weather_confirmed: true },
                }));

                await supabase.from("claims").insert(claimInserts);
              }
            }
          }
        }

        results.push({
          zone: zone.name,
          temperature,
          rainfall,
          aqi: aqiValue,
          triggers,
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
