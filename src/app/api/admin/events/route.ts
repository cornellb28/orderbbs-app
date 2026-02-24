import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active,created_at"
    )
    .order("pickup_date", { ascending: false });

  if (error) return noStoreJson({ error: error.message }, 500);

  const { data: statsRows, error: statsErr } = await supabase.rpc("admin_event_stats");

  if (statsErr) {
    const withEmptyStats = (events ?? []).map((e) => ({
      ...e,
      stats: {
        orders_total: 0,
        orders_paid: 0,
        orders_unpaid: 0,
        revenue_total_cents: 0,
        revenue_paid_cents: 0,
      },
    }));
    return noStoreJson({ events: withEmptyStats });
  }

  const statsById = new Map(
    (statsRows ?? []).map((r: any) => [
      r.event_id,
      {
        orders_total: Number(r.orders_total ?? 0),
        orders_paid: Number(r.orders_paid ?? 0),
        orders_unpaid: Number(r.orders_unpaid ?? 0),
        revenue_total_cents: Number(r.revenue_total_cents ?? 0),
        revenue_paid_cents: Number(r.revenue_paid_cents ?? 0),
      },
    ])
  );

  const merged = (events ?? []).map((e: any) => ({
    ...e,
    stats:
      statsById.get(e.id) ?? {
        orders_total: 0,
        orders_paid: 0,
        orders_unpaid: 0,
        revenue_total_cents: 0,
        revenue_paid_cents: 0,
      },
  }));

  return noStoreJson({ events: merged });
}