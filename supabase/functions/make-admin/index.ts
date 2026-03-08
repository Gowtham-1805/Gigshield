import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// This function promotes the calling user to admin
// Protected by a setup key to prevent unauthorized access
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { setup_key } = await req.json();
    
    const ADMIN_SETUP_KEY = Deno.env.get("ADMIN_SETUP_KEY");
    if (!ADMIN_SETUP_KEY) {
      return new Response(JSON.stringify({ error: "Admin setup is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (setup_key !== ADMIN_SETUP_KEY) {
      return new Response(JSON.stringify({ error: "Invalid setup key" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized — please sign in first");

    // Use service role to insert admin role
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if already admin
    const { data: existing } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ message: "Already an admin", user_id: user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertErr } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ 
      message: "Admin role assigned successfully!", 
      user_id: user.id,
      email: user.email,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("make-admin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
