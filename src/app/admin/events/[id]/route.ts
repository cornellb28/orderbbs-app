import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminOr401 } from "@/lib/admin-guard";

export const runtime = "nodejs";

type UpdateEventBody = Partial<{
  title: string;
  pickup_date: string;
  pickup_start: string;
  pickup_end: string;
  location_name: string;
  location_address: string;
  deadline: string;
}>;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const { id } = await ctx.params;
  const body = (await req.json()) as UpdateEventBody;

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.pickup_date === "string") patch.pickup_date = body.pickup_date;
  if (typeof body.pickup_start === "string") patch.pickup_start = body.pickup_start;
  if (typeof body.pickup_end === "string") patch.pickup_end = body.pickup_end;
  if (typeof body.location_name === "string") patch.location_name = body.location_name.trim();
  if (typeof body.location_address === "string") patch.location_address = body.location_address.trim();
  if (typeof body.deadline === "string") patch.deadline = body.deadline;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("events").update(patch).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const { id } = await ctx.params;

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}