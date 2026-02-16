import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Kind = "day-before" | "day-of";

function chicagoYMD(d: Date): string {
  // YYYY-MM-DD in America/Chicago
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
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

export async function GET(
  req: Request,
  { params }: { params: { kind: string } }
) {
  // Protect endpoint
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret) {
    return NextResponse.json({ error: "Missing CRON_SECRET" }, { status: 500 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind = params.kind as Kind;
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
    return NextResponse.json({ ok: false, error: eventErr.message }, { status: 500 });
  }
  if (!event) return NextResponse.json({ ok: true, sent: 0, note: "No active event" });

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
    return NextResponse.json({ ok: false, error: ordersErr.message }, { status: 500 });
  }

  let sent = 0;

  for (const o of orders ?? []) {
    const phone = o.phone as string;

    const msg =
      kind === "day-of"
        ? `Today is pickup day! ${event.title} pickup is ${event.pickup_date} ${event.pickup_start}-${event.pickup_end} at ${event.location_name}. ${event.location_address}`
        : `Reminder: pickup is tomorrow. ${event.title} pickup is ${event.pickup_date} ${event.pickup_start}-${event.pickup_end} at ${event.location_name}. ${event.location_address}`;

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
