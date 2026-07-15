import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminOr401 } from "@/lib/admin-guard";

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
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

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

function normalizeTime(t: string): string {
  const [hh = "00", mm = "00", ss = "00"] = t.split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const form = await req.formData();

  const title = String(form.get("title") ?? "").trim();
  const pickup_date = String(form.get("pickup_date") ?? "").trim();
  const pickup_start = String(form.get("pickup_start") ?? "").trim();
  const pickup_end = String(form.get("pickup_end") ?? "").trim();
  const location_name = String(form.get("location_name") ?? "").trim();
  const location_address = String(form.get("location_address") ?? "").trim();
  const deadlineRaw = String(form.get("deadline") ?? "").trim();

  if (!title || !pickup_date || !pickup_start || !pickup_end || !location_name || !location_address || !deadlineRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const deadline = new Date(deadlineRaw);
  if (Number.isNaN(deadline.getTime())) {
    return NextResponse.json({ error: "Invalid deadline value" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title,
      pickup_date,
      pickup_start: normalizeTime(pickup_start),
      pickup_end: normalizeTime(pickup_end),
      location_name,
      location_address,
      deadline: deadline.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL(`/admin/events/${event.id}`, req.url), 303);
  }

  return NextResponse.json({ ok: true, event });
}