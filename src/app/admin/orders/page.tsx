import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminOrdersPage() {
  const supabase = createSupabaseServerClient();

  const { data: activeEvent } = await supabase
    .from("events")
    .select("id, title, pickup_date")
    .eq("is_active", true)
    .order("pickup_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!activeEvent) {
    return <p>No active event.</p>;
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, created_at, customer_name, email, phone, total_cents, paid, status")
    .eq("event_id", activeEvent.id)
    .order("created_at", { ascending: false });

  if (error) return <p>Failed to load orders: {error.message}</p>;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1>Orders — {activeEvent.title}</h1>
      <p style={{ opacity: 0.8 }}>Pickup date: {activeEvent.pickup_date}</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th align="left">Time</th>
            <th align="left">Customer</th>
            <th align="left">Email</th>
            <th align="left">Total</th>
            <th align="left">Paid</th>
            <th align="left">Status</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((o) => (
            <tr key={o.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{new Date(o.created_at).toLocaleString()}</td>
              <td>{o.customer_name}</td>
              <td>{o.email}</td>
              <td>${(o.total_cents / 100).toFixed(2)}</td>
              <td>{o.paid ? "✅" : "—"}</td>
              <td>{o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
