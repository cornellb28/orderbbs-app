import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminHome() {
  const { user } = await requireAdmin();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 6 }}>Admin</h1>
      <p style={{ opacity: 0.7, marginBottom: 18 }}>
        Signed in as <strong>{user.email}</strong>
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/events">Manage Events</Link>
        <Link href="/admin/orders">View Orders</Link>
        <Link href="/admin/customers">Customers</Link>
      </div>

      <p style={{ marginTop: 24, opacity: 0.7 }}>
        (Next we’ll build these pages.)
      </p>
    </main>
  );
}