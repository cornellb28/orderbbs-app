import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

export async function GET(req: Request) {
  const supabase = createSupabaseAdminClient();
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret) {
    return NextResponse.json({ error: "Missing CRON_SECRET" }, { status: 500 });
  }

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // For MVP: send reminders for the active event
  const { data: event } = await supabase
    .from("events")
    .select("id, title, pickup_date, pickup_start, pickup_end, location_name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!event) return NextResponse.json({ ok: true, sent: 0 });

  // Grab confirmed, paid orders with phone numbers
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, phone, customer_name")
    .eq("event_id", event.id)
    .eq("paid", true)
    .eq("status", "confirmed")
    .not("phone", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const o of orders ?? []) {
    const phone = o.phone as string;
    const msg = `Reminder: ${event.title} pickup is ${event.pickup_date} ${event.pickup_start}-${event.pickup_end} at ${event.location_name}. See you soon!`;
    await sendSms(phone, msg);
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
