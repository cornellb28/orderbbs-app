import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

function fmtChicago(iso: string) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago" });
}

type CustomerDetail = {
  email: string;
  name: string | null;
  phone: string | null;
  sms_opt_in: boolean | null;
  notes: string | null;

  first_seen: string | null;
  last_seen: string | null;

  order_count: number;
  paid_order_count: number;
  last_order_status: string | null;
  last_order_paid: boolean | null;

  source: "orders" | "subscribers" | "both" | "unknown";
};

async function getCustomer(email: string): Promise<CustomerDetail | null> {
  const baseUrl = await getBaseUrl(); // ✅ await
  const res = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(email)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as CustomerDetail;
}

export default async function AdminCustomerViewPage({
  params,
}: {
  params: { email: string };
}) {
  const email = decodeURIComponent(params.email);
  const customer = await getCustomer(email);

  if (!customer) {
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1 style={{ marginTop: 0 }}>Customer not found</h1>
        <Link href="/admin/customers">← Back</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 6 }}>
            {customer.name ?? "Customer"}{" "}
            <span style={{ fontSize: 14, color: "#666", fontWeight: 400 }}>
              ({customer.email})
            </span>
          </h1>
          <div style={{ color: "#444", lineHeight: 1.5 }}>
            <div>Phone: {customer.phone ?? "—"}</div>
            <div>
              SMS Opt-in: {customer.sms_opt_in == null ? "—" : customer.sms_opt_in ? "Yes" : "No"}
            </div>
            <div>Source: {customer.source}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
          <Link href={`/admin/customers/${encodeURIComponent(customer.email)}/edit`}>Edit</Link>
          <Link href="/admin/customers">Back</Link>
        </div>
      </div>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 8 }}>Activity</h2>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
          <div>First Seen: {customer.first_seen ? fmtChicago(customer.first_seen) : "—"}</div>
          <div>Last Seen: {customer.last_seen ? fmtChicago(customer.last_seen) : "—"}</div>

          <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "12px 0" }} />

          <div>Total Orders: {customer.order_count}</div>
          <div>Paid Orders: {customer.paid_order_count}</div>
          <div>Last Order Status: {customer.last_order_status ?? "—"}</div>
          <div>Last Order Paid: {customer.last_order_paid == null ? "—" : customer.last_order_paid ? "Yes" : "No"}</div>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 8 }}>Notes</h2>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14, whiteSpace: "pre-wrap" }}>
          {customer.notes?.trim() ? customer.notes : "—"}
        </div>
      </section>
    </main>
  );
}