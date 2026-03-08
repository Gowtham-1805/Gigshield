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
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const { claim_id, reason, evidence_urls } = await req.json();
    if (!claim_id || !reason) throw new Error("claim_id and reason are required");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify claim belongs to user
    const { data: claim, error: claimErr } = await supabase
      .from("claims")
      .select("id, status, policy_id, policies!inner(worker_id, workers!inner(user_id))")
      .eq("id", claim_id)
      .single();

    if (claimErr || !claim) throw new Error("Claim not found");
    if ((claim as any).policies?.workers?.user_id !== user.id) throw new Error("Not your claim");

    // Only flagged or rejected claims can be appealed
    if (!["flagged", "rejected"].includes(claim.status)) {
      throw new Error("Only flagged or rejected claims can be appealed");
    }

    // Check if appeal already exists
    const { data: existing } = await supabase
      .from("appeals")
      .select("id")
      .eq("claim_id", claim_id)
      .single();

    if (existing) throw new Error("An appeal already exists for this claim");

    // Create appeal
    const { data: appeal, error: appealErr } = await supabase
      .from("appeals")
      .insert({
        claim_id,
        user_id: user.id,
        reason,
        evidence_urls: evidence_urls || [],
        status: "pending",
      })
      .select()
      .single();

    if (appealErr) throw appealErr;

    // Update claim status to processing
    await supabase
      .from("claims")
      .update({ status: "processing" })
      .eq("id", claim_id);

    // Notify admins
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins?.length) {
      await supabase.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.user_id,
          type: "claim" as const,
          title: "📨 New Appeal Submitted",
          message: `A worker has appealed claim #${claim_id.slice(0, 8)}. Review required.`,
          metadata: { appeal_id: appeal.id, claim_id },
        }))
      );
    }

    return new Response(JSON.stringify({ success: true, appeal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
