"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });

    // Stay in sync (logout/login, other tabs)
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    router.refresh();
  };

  return (
    <header
      style={{
        borderBottom: "1px solid #eee",
        background: "#fff",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Brand (always visible) */}
        <Link
          href="/admin"
          style={{
            fontWeight: 900,
            textDecoration: "none",
            color: "#111",
            letterSpacing: -0.5,
            whiteSpace: "nowrap",
          }}
        >
          Admin
        </Link>

        {/* Nav + Actions (only when logged in) */}
        {isLoggedIn ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Nav */}
            <nav style={{ display: "flex", gap: 18 }}>
              {adminNav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "6px 10px",
                      borderRadius: 8,
                      color: active ? "#fff" : "#111",
                      background: active ? "#111" : "transparent",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <button
              onClick={handleLogout}
              type="button"
              style={{
                fontSize: 14,
                fontWeight: 700,
                background: "transparent",
                border: "1px solid #eee",
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}