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

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { appeal_id, decision, admin_notes } = await req.json();
    if (!appeal_id || !decision) throw new Error("appeal_id and decision required");
    if (!["approved", "rejected"].includes(decision)) throw new Error("Decision must be approved or rejected");

    // Get appeal with claim info
    const { data: appeal, error: appealErr } = await supabase
      .from("appeals")
      .select("*, claims!inner(id, amount, policy_id)")
      .eq("id", appeal_id)
      .single();

    if (appealErr || !appeal) throw new Error("Appeal not found");
    if (!["pending", "under_review"].includes(appeal.status)) throw new Error("Appeal already resolved");

    // Update appeal
    await supabase
      .from("appeals")
      .update({ status: decision, admin_notes: admin_notes || null })
      .eq("id", appeal_id);

    // Update claim status based on decision
    const claimStatus = decision === "approved" ? "approved" : "rejected";
    await supabase
      .from("claims")
      .update({ status: claimStatus })
      .eq("id", (appeal as any).claims.id);

    // If approved, create payout
    if (decision === "approved") {
      await supabase.from("payouts").insert({
        claim_id: (appeal as any).claims.id,
        amount: (appeal as any).claims.amount,
        status: "completed",
        upi_id: `appeal-payout@upi`,
      });
    }

    // Notify the worker
    await supabase.from("notifications").insert({
      user_id: appeal.user_id,
      type: "claim" as const,
      title: decision === "approved" ? "🎉 Appeal Approved!" : "❌ Appeal Rejected",
      message: decision === "approved"
        ? `Your appeal was approved! ₹${(appeal as any).claims.amount} will be disbursed.`
        : `Your appeal was rejected.${admin_notes ? ` Reason: ${admin_notes}` : ""}`,
      metadata: { appeal_id, claim_id: (appeal as any).claims.id, decision },
    });

    return new Response(JSON.stringify({ success: true }), {
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
