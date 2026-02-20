import { NextResponse } from "next/server";
import { requireAdminOr401 } from "@/lib/admin-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type OrderCustomerRow = {
  customer_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  paid: boolean;
  status: string;
  sms_opt_in: boolean | null;
};

type SubscriberRow = {
  name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
};

type CustomerFromOrders = {
  customer_name: string;
  email: string;
  phone: string | null;
  created_at: string; // latest order we saw (because we sort desc)
  paid: boolean;
  status: string;
  sms_opt_in: boolean;
};

export async function GET() {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const supabase = createSupabaseServiceClient();

  // A) customers from orders (unique by email)
  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select("customer_name,email,phone,created_at,paid,status,sms_opt_in")
    .order("created_at", { ascending: false })
    .returns<OrderCustomerRow[]>();

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  const byEmail = new Map<string, CustomerFromOrders>();

  for (const o of orders ?? []) {
    const email = (o.email ?? "").toLowerCase().trim();
    if (!email) continue;

    // because orders are sorted DESC, first time we see an email is their latest order
    if (!byEmail.has(email)) {
      byEmail.set(email, {
        customer_name: o.customer_name,
        email,
        phone: o.phone ?? null,
        created_at: o.created_at,
        paid: o.paid,
        status: o.status,
        sms_opt_in: o.sms_opt_in === true,
      });
    }
  }

  const customersFromOrders = Array.from(byEmail.values());

  // B) subscribers
  const { data: subs, error: sErr } = await supabase
    .from("subscribers")
    .select("name,email,phone,created_at")
    .order("created_at", { ascending: false })
    .returns<SubscriberRow[]>();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({
    customersFromOrders,
    subscribers: subs ?? [],
  });
}