import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Token-gated, same security model as the order receipt page and calendar
// route: knowing the order id alone isn't enough, the public_token must also
// match. Used by the confirmation page to poll for the webhook having
// flipped the order to paid — the webhook remains the only source of truth
// for "paid", this just reads it back.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const token = searchParams.get("t");

  if (!id || !token) {
    return NextResponse.json({ error: "Missing id or token" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("paid, status")
    .eq("id", id)
    .eq("public_token", token)
    .maybeSingle<{ paid: boolean; status: string }>();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ paid: data.paid, status: data.status });
}
