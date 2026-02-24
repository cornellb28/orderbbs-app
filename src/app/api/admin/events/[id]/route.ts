import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EventUpdate = {
  title?: string;
  pickup_date?: string;
  pickup_start?: string;
  pickup_end?: string;
  location_name?: string;
  location_address?: string;
  deadline?: string;
};

export const dynamic = "force-dynamic";

function asChicagoTimestamptz(datetimeLocalOrIso: string): string | undefined {
  const d = new Date(datetimeLocalOrIso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function normalizeTime(t?: string) {
  if (!t) return undefined;
  const parts = t.split(":");
  const hh = (parts[0] ?? "00").padStart(2, "0");
  const mm = (parts[1] ?? "00").padStart(2, "0");
  const ss = (parts[2] ?? "00").padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}


export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!id || id === "undefined") {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const supabase = await createSupabaseAdminClient();
  const body = await req.json();

  const deadlineIso = body.deadline ? asChicagoTimestamptz(body.deadline) : undefined;
  if (body.deadline && !deadlineIso) {
    return NextResponse.json({ error: "Invalid deadline value" }, { status: 400 });
  }

  const update: EventUpdate = {
    title: body.title,
    pickup_date: body.pickup_date,
    pickup_start: normalizeTime(body.pickup_start),
    pickup_end: normalizeTime(body.pickup_end),
    location_name: body.location_name,
    location_address: body.location_address,
    deadline: deadlineIso,
  };

  (Object.keys(update) as (keyof EventUpdate)[]).forEach((k) => {
    if (update[k] === undefined) delete update[k];
  });

  // ✅ Update AND return updated row. If RLS blocks update or select, this fails.
  const { data: event, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .select("id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, event });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!id || id === "undefined") {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const supabase = await createSupabaseAdminClient();

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}