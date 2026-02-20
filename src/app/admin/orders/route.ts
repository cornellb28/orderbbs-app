import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminOr401 } from "@/lib/admin-auth";

export const runtime = "nodejs";

type DbOrderRow = {
  id: string;
  event_id: string;
  status: string;
  paid: boolean;
  total_cents: number;
  customer_name: string;
  email: string;
  phone: string | null;
  sms_opt_in: boolean | null;
  created_at: string;
  public_token: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
};

export async function GET(req: NextRequest) {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const eventId = url.searchParams.get("event");

  if (!eventId) {
    return NextResponse.json({ error: "Missing event query param" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // Fetch event metadata (title + pickup info) so page can show header
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id,title,pickup_date,pickup_start,pickup_end,location_name,deadline,is_active")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr) return NextResponse.json({ error: eventErr.message }, { status: 500 });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Fetch orders for this event
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select(
      "id,event_id,status,paid,total_cents,customer_name,email,phone,sms_opt_in,created_at,public_token,stripe_session_id,stripe_payment_intent_id"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .returns<DbOrderRow[]>();

  if (ordersErr) return NextResponse.json({ error: ordersErr.message }, { status: 500 });

  const safeOrders =
    (orders ?? []).map((o) => ({
      id: o.id,
      status: o.status,
      paid: o.paid,
      total_cents: o.total_cents,
      customer_name: o.customer_name,
      email: o.email,
      phone: o.phone,
      sms_opt_in: o.sms_opt_in ?? false,
      created_at: o.created_at,
      public_token: o.public_token,
      stripe_session_id: o.stripe_session_id,
      stripe_payment_intent_id: o.stripe_payment_intent_id,
    })) ?? [];

  const totals = safeOrders.reduce(
    (acc, o) => {
      acc.count_total += 1;
      acc.revenue_total_cents += o.total_cents ?? 0;

      if (o.paid) {
        acc.count_paid += 1;
        acc.revenue_paid_cents += o.total_cents ?? 0;
      } else {
        acc.count_unpaid += 1;
      }
      return acc;
    },
    {
      count_total: 0,
      count_paid: 0,
      count_unpaid: 0,
      revenue_total_cents: 0,
      revenue_paid_cents: 0,
    }
  );

  return NextResponse.json({
    event,
    totals,
    orders: safeOrders,
  });
}