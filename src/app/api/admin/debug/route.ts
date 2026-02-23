import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ step: "auth.getUser", error: authErr.message }, { status: 500 });
  if (!auth.user) return NextResponse.json({ step: "auth.getUser", error: "no user" }, { status: 401 });

  const { data: row, error: rowErr } = await supabase
    .from("admin_users")
    .select("user_id, email, is_active")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    user: { id: auth.user.id, email: auth.user.email },
    adminRow: row ?? null,
    adminRowError: rowErr?.message ?? null,
  });
}