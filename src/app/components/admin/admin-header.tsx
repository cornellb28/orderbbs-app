"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminHeader() {
  const pathname = usePathname();

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
        {/* Brand */}
        <Link
          href="/admin"
          style={{
            fontWeight: 900,
            textDecoration: "none",
            color: "#111",
            letterSpacing: -0.5,
          }}
        >
          Admin
        </Link>

        {/* Nav */}
        <nav style={{ display: "flex", gap: 18 }}>
          {adminNav.map((item) => {
            const active = pathname.startsWith(item.href);

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
      </div>
    </header>
  );
}