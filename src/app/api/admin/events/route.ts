import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventRow = {
  id: string;
  title: string;
  pickup_date: string;
  pickup_start: string | null;
  pickup_end: string | null;
  location_name: string | null;
  location_address: string | null;
  deadline: string | null;
  is_active: boolean;
  created_at: string;
};

type AdminEventStatsRow = {
  event_id: string;
  orders_total: number | null;
  orders_paid: number | null;
  orders_unpaid: number | null;
  revenue_total_cents: number | null;
  revenue_paid_cents: number | null;
};

type EventStats = {
  orders_total: number;
  orders_paid: number;
  orders_unpaid: number;
  revenue_total_cents: number;
  revenue_paid_cents: number;
};

type EventWithStats = EventRow & { stats: EventStats };

const EMPTY_STATS: EventStats = {
  orders_total: 0,
  orders_paid: 0,
  orders_unpaid: 0,
  revenue_total_cents: 0,
  revenue_paid_cents: 0,
};

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(_req: Request) {
  const supabase = await createSupabaseServerClient();

  // 1) Fetch events (no .returns<T>() so it works across versions)
  const eventsRes = await supabase
    .from("events")
    .select(
      "id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active,created_at"
    )
    .order("pickup_date", { ascending: false });

  if (eventsRes.error) {
    return noStoreJson({ error: eventsRes.error.message }, 500);
  }

  const events = (eventsRes.data ?? []) as EventRow[];

  // 2) Fetch stats from RPC (also no .returns<T>())
  const statsRes = await supabase.rpc("admin_event_stats");

  // If stats fails, return events with zeros (UI stays usable)
  if (statsRes.error) {
    const withEmptyStats: EventWithStats[] = events.map((e) => ({
      ...e,
      stats: EMPTY_STATS,
    }));
    return noStoreJson({ events: withEmptyStats, statsUnavailable: true });
  }

  const statsRows = (statsRes.data ?? []) as AdminEventStatsRow[];

  // 3) Merge by event_id
  const statsById = new Map<string, EventStats>(
    statsRows.map((r) => [
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

  const merged: EventWithStats[] = events.map((e) => ({
    ...e,
    stats: statsById.get(e.id) ?? EMPTY_STATS,
  }));

  return noStoreJson({ events: merged });
}