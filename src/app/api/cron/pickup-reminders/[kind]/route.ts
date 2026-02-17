import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Kind = "day-before" | "day-of";

type Ctx = { params: Promise<{ kind: string }> };

function chicagoYMD(d: Date): string {
  // YYYY-MM-DD in America/Chicago
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function chicagoTimeLabel(timeStr: string) {
  // Converts "13:00:00" -> "1:00 PM" (CT)
  const [hh = "00", mm = "00"] = String(timeStr).split(":");
  const dt = new Date(`2000-01-01T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.warn("Twilio not configured");
    return;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Twilio SMS failed:", text);
  }
}

function isAuthorized(req: NextRequest) {
  // ✅ Vercel cron sets this header automatically
  if (req.headers.get("x-vercel-cron") === "1") return true;

  // Optional manual testing path:
  // Hit: /api/cron/pickup-reminders/day-before?secret=YOUR_SECRET
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const { searchParams } = new URL(req.url);
  return searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  // ✅ Protect endpoint
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { kind: kindRaw } = await ctx.params;
  const kind = kindRaw as Kind;

  if (kind !== "day-before" && kind !== "day-of") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Use active event for MVP
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select(
      "id, title, pickup_date, pickup_start, pickup_end, location_name, location_address"
    )
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (eventErr) {
    return NextResponse.json(
      { ok: false, error: eventErr.message },
      { status: 500 }
    );
  }
  if (!event) {
    return NextResponse.json({ ok: true, sent: 0, note: "No active event" });
  }

  const now = new Date();
  const today = chicagoYMD(now);
  const tomorrow = chicagoYMD(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const targetPickupDate = kind === "day-of" ? today : tomorrow;

  // Only send for the event matching the target pickup date
  if (event.pickup_date !== targetPickupDate) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      note: `Active event pickup_date (${event.pickup_date}) does not match target (${targetPickupDate})`,
    });
  }

  const reminderColumn =
    kind === "day-of"
      ? "pickup_reminder_day_of_sent_at"
      : "pickup_reminder_day_before_sent_at";

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, phone, customer_name")
    .eq("event_id", event.id)
    .eq("paid", true)
    .eq("status", "confirmed")
    .not("phone", "is", null)
    .is(reminderColumn, null);

  if (ordersErr) {
    return NextResponse.json(
      { ok: false, error: ordersErr.message },
      { status: 500 }
    );
  }

  let sent = 0;

  const pickupTime = `${chicagoTimeLabel(event.pickup_start)}–${chicagoTimeLabel(event.pickup_end)}`;

  for (const o of orders ?? []) {
    const phone = o.phone as string;

    const msg =
      kind === "day-of"
        ? `Today is pickup day! ${event.title} pickup is today (${event.pickup_date}) ${pickupTime} at ${event.location_name}. ${event.location_address}`
        : `Reminder: pickup is tomorrow. ${event.title} pickup is ${event.pickup_date} ${pickupTime} at ${event.location_name}. ${event.location_address}`;

    await sendSms(phone, msg);

    // Mark sent so we don't resend
    await supabase
      .from("orders")
      .update({ [reminderColumn]: new Date().toISOString() })
      .eq("id", o.id);

    sent += 1;
  }

  return NextResponse.json({ ok: true, kind, sent, targetPickupDate });
}


