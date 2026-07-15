import { getStripe } from "@/lib/stripe";
import { getOrderSummary } from "@/lib/orders";
import { Separator } from "@/components/ui/separator";

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
      <main className="max-w-[720px] mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Payment Successful ✅</h1>
        <p className="text-muted-foreground">Missing session_id.</p>
      </main>
    );
  }

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    return (
      <main className="max-w-[720px] mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Payment Successful ✅</h1>
        <p className="text-muted-foreground">We couldn’t find your order reference. Contact support.</p>
      </main>
    );
  }

  const order = await getOrderSummary(orderId);

  if (!order) {
    return (
      <main className="max-w-[720px] mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Payment Successful ✅</h1>
        <p className="text-muted-foreground">Order not found yet. Please refresh in a moment.</p>
      </main>
    );
  }

  return (
    <main className="max-w-[720px] mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Order Confirmed ✅</h1>

      <p className="text-muted-foreground">
        Order: <strong className="text-foreground">{order.id}</strong>
        <br />
        {order.customer_name} · {order.email}
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-1">Pickup</h2>
      <p>
        <strong>{order.event.title}</strong>
        <br />
        {order.event.pickup_date} · {order.event.pickup_start}–{order.event.pickup_end}
        <br />
        {order.event.location_name}
        <br />
        <span className="text-muted-foreground">{order.event.location_address}</span>
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-1">Items</h2>
      <ul className="list-disc pl-5">
        {order.items.map((it, idx) => (
          <li key={idx}>
            {it.qty}× {it.product.name} — ${(it.line_total_cents / 100).toFixed(2)}
          </li>
        ))}
      </ul>

      <Separator className="my-4" />

      <p className="font-bold text-lg">
        Total: ${(order.total_cents / 100).toFixed(2)}
      </p>
    </main>
  );
}
