export const dynamic = "force-dynamic";

type OrderCustomer = {
  customer_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  paid: boolean;
  status: string;
  sms_opt_in: boolean;
};

type Subscriber = {
  name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
};

type CustomersPayload = {
  customersFromOrders: OrderCustomer[];
  subscribers: Subscriber[];
};

function fmtChicago(iso: string) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago" });
}

async function getCustomers(): Promise<CustomersPayload> {
  const res = await fetch("/api/admin/customers", { cache: "no-store" });

  if (!res.ok) {
    return { customersFromOrders: [], subscribers: [] };
  }

  const data = (await res.json()) as Partial<CustomersPayload>;

  return {
    customersFromOrders: (data.customersFromOrders ?? []) as OrderCustomer[],
    subscribers: (data.subscribers ?? []) as Subscriber[],
  };
}

export default async function AdminCustomersPage() {
  const { customersFromOrders, subscribers } = await getCustomers();

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ marginTop: 0 }}>Admin · Customers</h1>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 8 }}>Customers (from Orders)</h2>
        <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10 }}>Name</th>
                <th style={{ textAlign: "left", padding: 10 }}>Email</th>
                <th style={{ textAlign: "left", padding: 10 }}>Phone</th>
                <th style={{ textAlign: "left", padding: 10 }}>SMS Opt-in</th>
                <th style={{ textAlign: "left", padding: 10 }}>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {customersFromOrders.map((c) => (
                <tr key={c.email} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{c.customer_name}</td>
                  <td style={{ padding: 10 }}>{c.email}</td>
                  <td style={{ padding: 10 }}>{c.phone ?? "—"}</td>
                  <td style={{ padding: 10 }}>{c.sms_opt_in ? "Yes" : "No"}</td>
                  <td style={{ padding: 10 }}>{fmtChicago(c.created_at)}</td>
                </tr>
              ))}

              {customersFromOrders.length === 0 ? (
                <tr>
                  <td style={{ padding: 12 }} colSpan={5}>
                    No customers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 8 }}>Subscribers (Next Drop List)</h2>
        <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10 }}>Name</th>
                <th style={{ textAlign: "left", padding: 10 }}>Email</th>
                <th style={{ textAlign: "left", padding: 10 }}>Phone</th>
                <th style={{ textAlign: "left", padding: 10 }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.email} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{s.name ?? "—"}</td>
                  <td style={{ padding: 10 }}>{s.email}</td>
                  <td style={{ padding: 10 }}>{s.phone ?? "—"}</td>
                  <td style={{ padding: 10 }}>{fmtChicago(s.created_at)}</td>
                </tr>
              ))}

              {subscribers.length === 0 ? (
                <tr>
                  <td style={{ padding: 12 }} colSpan={4}>
                    No subscribers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}