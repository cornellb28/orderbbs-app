import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminOr401 } from "@/lib/admin-guard";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const { id } = await ctx.params;
  const supabase = createSupabaseServiceClient();

  // 1) deactivate all
  const { error: offErr } = await supabase.from("events").update({ is_active: false }).eq("is_active", true);
  if (offErr) return NextResponse.json({ error: offErr.message }, { status: 500 });

  // 2) activate selected event
  const { error: onErr } = await supabase.from("events").update({ is_active: true }).eq("id", id);
  if (onErr) return NextResponse.json({ error: onErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}