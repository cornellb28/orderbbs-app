import { NextResponse } from "next/server";
import { requireAdminOr401 } from "@/lib/admin-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CustomerProfileRow = {
  email: string;
  name: string | null;
  phone: string | null;
  sms_opt_in: boolean | null;
  vip: boolean;              // ✅ add
  notes: string | null;
  updated_at: string;
};

type SubscriberRow = {
  name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
};

type OrderRow = {
  customer_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  paid: boolean;
  status: string;
  sms_opt_in: boolean | null;
};

function normEmail(raw: string) {
  return decodeURIComponent(raw).toLowerCase().trim();
}

export async function GET(_req: Request, ctx: { params: { email: string } }) {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const supabase = createSupabaseAdminClient();
  const email = normEmail(ctx.params.email);

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  // profile
  const { data: profile, error: pErr } = await supabase
    .from("customer_profiles")
    .select("email,name,phone,sms_opt_in,vip,notes,updated_at")
    .eq("email", email)
    .maybeSingle<CustomerProfileRow>();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // subscriber
  const { data: subscriber, error: sErr } = await supabase
    .from("subscribers")
    .select("name,email,phone,created_at")
    .eq("email", email)
    .maybeSingle<SubscriberRow>();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // latest order
  const { data: latestOrder, error: loErr } = await supabase
    .from("orders")
    .select("customer_name,email,phone,created_at,paid,status,sms_opt_in")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<OrderRow>();

  if (loErr) return NextResponse.json({ error: loErr.message }, { status: 500 });

  // first order
  const { data: firstOrder, error: foErr } = await supabase
    .from("orders")
    .select("created_at")
    .eq("email", email)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ created_at: string }>();

  if (foErr) return NextResponse.json({ error: foErr.message }, { status: 500 });

  // counts
  const { count: orderCount, error: ocErr } = await supabase
    .from("orders")
    .select("email", { count: "exact", head: true })
    .eq("email", email);

  if (ocErr) return NextResponse.json({ error: ocErr.message }, { status: 500 });

  const { count: paidCount, error: pcErr } = await supabase
    .from("orders")
    .select("email", { count: "exact", head: true })
    .eq("email", email)
    .eq("paid", true);

  if (pcErr) return NextResponse.json({ error: pcErr.message }, { status: 500 });

  // Merge rules: profile overrides subscriber overrides orders
  const mergedName = profile?.name ?? subscriber?.name ?? latestOrder?.customer_name ?? null;
  const mergedPhone = profile?.phone ?? subscriber?.phone ?? latestOrder?.phone ?? null;

  const mergedSmsOptIn =
    profile?.sms_opt_in ??
    (latestOrder ? latestOrder.sms_opt_in === true : null);

  const source =
    latestOrder && subscriber ? "both" : latestOrder ? "orders" : subscriber ? "subscribers" : "unknown";

  return NextResponse.json({
    email,
    name: mergedName,
    phone: mergedPhone,
    sms_opt_in: mergedSmsOptIn,
    vip: profile?.vip === true,
    notes: profile?.notes ?? null,

    first_seen: firstOrder?.created_at ?? subscriber?.created_at ?? null,
    last_seen: latestOrder?.created_at ?? subscriber?.created_at ?? null,

    order_count: orderCount ?? 0,
    paid_order_count: paidCount ?? 0,
    last_order_status: latestOrder?.status ?? null,
    last_order_paid: latestOrder?.paid ?? null,

    source,
  });
}

export async function PATCH(req: Request, ctx: { params: { email: string } }) {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const supabase = createSupabaseAdminClient();
  const email = normEmail(ctx.params.email);

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const name = body.name === null || typeof body.name === "string" ? body.name : undefined;
  const phone = body.phone === null || typeof body.phone === "string" ? body.phone : undefined;
  const sms_opt_in = typeof body.sms_opt_in === "boolean" ? body.sms_opt_in : undefined;
  const notes = body.notes === null || typeof body.notes === "string" ? body.notes : undefined;
  const vip = typeof body.vip === "boolean" ? body.vip : undefined;

  if (
    name === undefined ||
    phone === undefined ||
    sms_opt_in === undefined ||
    vip === undefined ||
    notes === undefined
  ) {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("customer_profiles")
    .upsert(
      {
        email,
        name,
        phone,
        sms_opt_in,
        vip,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}