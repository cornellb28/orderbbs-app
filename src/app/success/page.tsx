import { stripe } from "@/lib/stripe";
import { getOrderSummary } from "@/lib/orders";

type SearchParams = { session_id?: string };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const sessionId = sp.session_id;

  if (!sessionId) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1>Payment Successful ✅</h1>
        <p>Missing session_id.</p>
      </main>
    );
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1>Payment Successful ✅</h1>
        <p>We couldn’t find your order reference. Contact support.</p>
      </main>
    );
  }

  const order = await getOrderSummary(orderId);

  if (!order) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1>Payment Successful ✅</h1>
        <p>Order not found yet. Please refresh in a moment.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1>Order Confirmed ✅</h1>

      <p style={{ opacity: 0.8 }}>
        Order: <strong>{order.id}</strong>
        <br />
        {order.customer_name} · {order.email}
      </p>

      <h2 style={{ marginTop: "1.5rem" }}>Pickup</h2>
      <p>
        <strong>{order.event.title}</strong>
        <br />
        {order.event.pickup_date} · {order.event.pickup_start}–{order.event.pickup_end}
        <br />
        {order.event.location_name}
        <br />
        <span style={{ opacity: 0.8 }}>{order.event.location_address}</span>
      </p>

      <h2 style={{ marginTop: "1.5rem" }}>Items</h2>
      <ul>
        {order.items.map((it, idx) => (
          <li key={idx}>
            {it.qty}× {it.product.name} — ${(it.line_total_cents / 100).toFixed(2)}
          </li>
        ))}
      </ul>

      <p style={{ marginTop: "1rem", fontWeight: 700 }}>
        Total: ${(order.total_cents / 100).toFixed(2)}
      </p>
    </main>
  );
}
