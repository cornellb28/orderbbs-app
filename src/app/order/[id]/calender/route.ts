import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

type DbEvent = {
  title: string;
  pickup_date: string;
  pickup_start: string;
  pickup_end: string;
  location_name: string;
  location_address: string;
};

type DbOrderRow = {
  id: string;
  public_token: string;
  events: DbEvent | DbEvent[] | null;
};

function toICSDateTimeLocal(pickup_date: string, pickup_time: string) {
  // pickup_date: YYYY-MM-DD
  // pickup_time: HH:MM:SS or HH:MM
  const [y, m, d] = pickup_date.split("-");
  const [hh = "00", mm = "00", ss = "00"] = pickup_time.split(":");
  return `${y}${m}${d}T${hh.padStart(2, "0")}${mm.padStart(2, "0")}${ss.padStart(2, "0")}`;
}

function escapeICS(text: string) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function getSingleEvent(events: DbOrderRow["events"]): DbEvent | null {
  if (!events) return null;
  return Array.isArray(events) ? events[0] ?? null : events;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      public_token,
      events (
        title,
        pickup_date,
        pickup_start,
        pickup_end,
        location_name,
        location_address
      )
    `
    )
    .eq("id", id)
    .eq("public_token", token)
    .maybeSingle<DbOrderRow>();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const evt = getSingleEvent(data.events);
  if (!evt) {
    return NextResponse.json({ error: "Event not found for order" }, { status: 404 });
  }

  const dtStart = toICSDateTimeLocal(evt.pickup_date, evt.pickup_start);
  const dtEnd = toICSDateTimeLocal(evt.pickup_date, evt.pickup_end);

  const summary = `Pickup — ${evt.title}`;
  const location = `${evt.location_name} — ${evt.location_address}`;
  const description = `Order ${data.id} pickup for Bowl & Broth Society.`;

  const dtstamp =
    new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bowl & Broth Society//Order Pickup//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${data.id}@bowlandbrothsociety`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=America/Chicago:${dtStart}`,
    `DTEND;TZID=America/Chicago:${dtEnd}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pickup-${data.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
