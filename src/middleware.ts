import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes (and allow /admin/login)
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
      { status: 500 }
    );
  }

  // Create a response we can attach updated cookies to
  const res = NextResponse.next();

  const supabase = createServerClient(url, anon, {
    cookies: {
      // Next 16 typing-safe (treat cookies as async)
      async getAll() {
        return req.cookies.getAll();
      },
      async setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // 1) Must be logged in
  const { data: auth, error: authErr } = await supabase.auth.getUser();

  if (authErr || !auth.user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2) Must be allowlisted (admin_users)
  const { data: adminRow, error: adminErr } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminErr || !adminRow) {
    // If logged in but not allowlisted, send to login with error (or you could show a 403 page)
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("error", "not_admin");
    return NextResponse.redirect(loginUrl);
  }

  // Return the SAME response object (so refreshed cookies persist)
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};