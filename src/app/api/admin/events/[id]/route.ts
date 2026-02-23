import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asChicagoTimestamptz(datetimeLocal: string) {
  return new Date(datetimeLocal).toISOString();
  // Recommended: date-fns-tz zonedTimeToUtc(datetimeLocal, "America/Chicago").toISOString()
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const body = await req.json();

  const update = {
    title: body.title,
    pickup_date: body.pickup_date,
    pickup_start: body.pickup_start,
    pickup_end: body.pickup_end,
    location_name: body.location_name,
    location_address: body.location_address,
    deadline: body.deadline ? asChicagoTimestamptz(body.deadline) : undefined,
  };

  // remove undefined keys
  Object.keys(update).forEach((k) => (update as any)[k] === undefined && delete (update as any)[k]);

  const { error } = await supabase.from("events").update(update).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("events").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}