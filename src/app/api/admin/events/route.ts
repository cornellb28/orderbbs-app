import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asChicagoTimestamptz(datetimeLocal: string) {
  // datetimeLocal is like "2026-02-23T18:30"
  // We store as ISO w/ offset by assuming America/Chicago.
  // Minimal approach: append current offset manually is error-prone (DST).
  // Best: store as timestamptz but send ISO from client or use a tz library.
  //
  // If you can install a tz lib, do it (recommended):
  //   npm i date-fns-tz
  // and use zonedTimeToUtc (see snippet below).
  //
  // For now, assume browser is already in America/Chicago and treat it as local:
  return new Date(datetimeLocal).toISOString();
}

// If you install date-fns-tz, replace asChicagoTimestamptz with:
//
// import { zonedTimeToUtc } from "date-fns-tz";
// function asChicagoTimestamptz(datetimeLocal: string) {
//   const utc = zonedTimeToUtc(datetimeLocal, "America/Chicago");
//   return utc.toISOString();
// }

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: events, error } = await supabase
    .from("events")
    .select("id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active,created_at")
    .order("pickup_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Pull stats via RPC
  const { data: statsRows, error: statsErr } = await supabase.rpc("admin_event_stats");
  if (statsErr) {
    // Don’t hard-fail list if stats function isn’t set up yet
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
    return NextResponse.json({ events: withEmptyStats });
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
      statsById.get(e.id) ??
      {
        orders_total: 0,
        orders_paid: 0,
        orders_unpaid: 0,
        revenue_total_cents: 0,
        revenue_paid_cents: 0,
      },
  }));

  return NextResponse.json({ events: merged });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const form = await req.formData();

  const payload = {
    title: String(form.get("title") ?? ""),
    pickup_date: String(form.get("pickup_date") ?? ""),
    pickup_start: String(form.get("pickup_start") ?? ""),
    pickup_end: String(form.get("pickup_end") ?? ""),
    location_name: String(form.get("location_name") ?? ""),
    location_address: String(form.get("location_address") ?? ""),
    deadline: asChicagoTimestamptz(String(form.get("deadline") ?? "")),
    is_active: false,
  };

  const { data, error } = await supabase
    .from("events")
    .insert(payload)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // For form posts, redirect to edit page
  return NextResponse.redirect(new URL(`/admin/events/${data.id}`, req.url), 303);
}