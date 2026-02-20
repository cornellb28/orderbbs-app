import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ marginTop: 0 }}>Admin Dashboard</h1>
      <p style={{ opacity: 0.75 }}>
        Manage drops, orders, and customer lists.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 18 }}>
        <Card
          title="Events"
          desc="Create/edit drop dates, deadline, active toggle, menu."
          href="/admin/events"
        />
        <Card
          title="Orders"
          desc="View paid orders, totals, and statuses by event."
          href="/admin/orders"
        />
        <Card
          title="Customers"
          desc="See customers (from orders) and subscribers list."
          href="/admin/customers"
        />
      </div>
    </main>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 16,
        border: "1px solid #eee",
        borderRadius: 12,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
      <div style={{ marginTop: 6, opacity: 0.75, lineHeight: 1.4 }}>{desc}</div>
      <div style={{ marginTop: 10, fontWeight: 700 }}>Open →</div>
    </Link>
  );
}