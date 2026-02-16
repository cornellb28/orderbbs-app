import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
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
    `)
    .eq("id", params.id)
    .eq("public_token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const evt = data.events;

  const dtStart = toICSDateTimeLocal(evt.pickup_date, evt.pickup_start);
  const dtEnd = toICSDateTimeLocal(evt.pickup_date, evt.pickup_end);

  const summary = `Pickup — ${evt.title}`;
  const location = `${evt.location_name} — ${evt.location_address}`;
  const description = `Order ${data.id} pickup for Bowl & Broth Society.`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bowl & Broth Society//Order Pickup//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${data.id}@bowlandbrothsociety`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
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
