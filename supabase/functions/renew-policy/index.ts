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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { policy_id, tier } = await req.json();
    if (!policy_id) throw new Error("policy_id is required");

    // Server-side authoritative pricing
    const PLAN_PRICING: Record<string, { premium: number; max_payout: number }> = {
      BASIC:    { premium: 39, max_payout: 800 },
      STANDARD: { premium: 49, max_payout: 1500 },
      PRO:      { premium: 99, max_payout: 2500 },
    };

    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the policy belongs to this user
    const { data: policy, error: polErr } = await supabase
      .from("policies")
      .select("*, workers!inner(user_id)")
      .eq("id", policy_id)
      .single();

    if (polErr || !policy) throw new Error("Policy not found");
    if ((policy as any).workers.user_id !== user.id) throw new Error("Not your policy");

    const selectedTier = tier && PLAN_PRICING[tier] ? tier : policy.tier;
    const pricing = PLAN_PRICING[selectedTier] || PLAN_PRICING["STANDARD"];

    // Expire old policy
    await supabase.from("policies").update({ status: "expired" }).eq("id", policy_id);

    // Create new policy
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 86400000);

    const { data: newPolicy, error: insertErr } = await supabase
      .from("policies")
      .insert({
        worker_id: policy.worker_id,
        tier: selectedTier,
        premium: pricing.premium,
        max_payout: pricing.max_payout,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        status: "active",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      message: "Policy renewed successfully!",
      old_policy_id: policy_id,
      new_policy: newPolicy,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("renew-policy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
