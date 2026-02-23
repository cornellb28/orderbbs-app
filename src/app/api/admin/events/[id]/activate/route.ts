import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();

  // Deactivate all, then activate target.
  // If you added the unique partial index, this is safe + enforced.
  const { error: offErr } = await supabase.from("events").update({ is_active: false }).eq("is_active", true);
  if (offErr) return NextResponse.json({ error: offErr.message }, { status: 400 });

  const { error: onErr } = await supabase.from("events").update({ is_active: true }).eq("id", params.id);
  if (onErr) return NextResponse.json({ error: onErr.message }, { status: 400 });

  // If this was a form submit, redirect back
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL("/admin/events", req.url), 303);
  }

  return NextResponse.json({ ok: true });
}