import Link from "next/link";

type SearchParams = { event?: string };

type AdminOrdersResponse = {
  event: {
    id: string;
    title: string;
    pickup_date: string;
    pickup_start: string;
    pickup_end: string;
    location_name: string;
    deadline: string;
    is_active: boolean;
  };
  totals: {
    count_total: number;
    count_paid: number;
    count_unpaid: number;
    revenue_total_cents: number;
    revenue_paid_cents: number;
  };
  orders: Array<{
    id: string;
    status: string;
    paid: boolean;
    total_cents: number;
    customer_name: string;
    email: string;
    phone: string | null;
    sms_opt_in: boolean;
    created_at: string;
    public_token: string;
    stripe_session_id: string | null;
    stripe_payment_intent_id: string | null;
  }>;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function fmtPickupDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function fmtPickupTime(timeStr: string) {
  const [hh = "00", mm = "00"] = timeStr.split(":");
  const d = new Date(`2000-01-01T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

async function fetchAdminOrders(eventId: string): Promise<AdminOrdersResponse> {
  // relative fetch works on Vercel & local
  const res = await fetch(`/api/admin/orders?event=${encodeURIComponent(eventId)}`, {
    cache: "no-store",
  });

  const data = (await res.json()) as { error?: string } & Partial<AdminOrdersResponse>;
  if (!res.ok || !data.event || !data.orders || !data.totals) {
    throw new Error(data.error || "Failed to load admin orders");
  }
  return data as AdminOrdersResponse;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const eventId = sp.event;

  if (!eventId) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Orders</h1>
        <p style={{ opacity: 0.8 }}>
          Missing <code>?event=&lt;id&gt;</code>. Go to{" "}
          <Link href="/admin/events">/admin/events</Link> and click “View Orders”.
        </p>
      </main>
    );
  }

  let payload: AdminOrdersResponse;
  try {
    payload = await fetchAdminOrders(eventId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Orders</h1>
        <p style={{ color: "#b00020" }}>{msg}</p>
        <p>
          <Link href="/admin/events">← Back to Events</Link>
        </p>
      </main>
    );
  }

  const { event, totals, orders } = payload;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: 6 }}>Orders</h1>
          <div style={{ opacity: 0.8, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700 }}>{event.title}</div>
            <div>
              Pickup: {fmtPickupDate(event.pickup_date)} ·{" "}
              {fmtPickupTime(event.pickup_start)}–{fmtPickupTime(event.pickup_end)}
            </div>
            <div>Location: {event.location_name}</div>
            <div>
              Deadline:{" "}
              {new Intl.DateTimeFormat("en-US", {
                timeZone: "America/Chicago",
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(event.deadline))}
              {event.is_active ? " · (Active)" : " · (Inactive)"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Link href="/admin/events" style={{ textDecoration: "none", fontWeight: 700 }}>
            ← Events
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ padding: "10px 12px", border: "1px solid #eee", borderRadius: 10 }}>
          <div style={{ fontWeight: 700 }}>Orders</div>
          <div style={{ opacity: 0.85 }}>
            {totals.count_total} total · {totals.count_paid} paid · {totals.count_unpaid} unpaid
          </div>
        </div>

        <div style={{ padding: "10px 12px", border: "1px solid #eee", borderRadius: 10 }}>
          <div style={{ fontWeight: 700 }}>Revenue (paid)</div>
          <div style={{ opacity: 0.85 }}>{money(totals.revenue_paid_cents)}</div>
        </div>

        <div style={{ padding: "10px 12px", border: "1px solid #eee", borderRadius: 10 }}>
          <div style={{ fontWeight: 700 }}>Revenue (total)</div>
          <div style={{ opacity: 0.85 }}>{money(totals.revenue_total_cents)}</div>
        </div>
      </div>

      <div style={{ marginTop: 18, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: "10px 8px" }}>Created</th>
              <th style={{ padding: "10px 8px" }}>Customer</th>
              <th style={{ padding: "10px 8px" }}>Contact</th>
              <th style={{ padding: "10px 8px" }}>Status</th>
              <th style={{ padding: "10px 8px" }}>Total</th>
              <th style={{ padding: "10px 8px" }}>Links</th>
            </tr>
          </thead>

          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "14px 8px", opacity: 0.75 }}>
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const receiptUrl = `/order/${o.id}?t=${encodeURIComponent(o.public_token)}`;
                return (
                  <tr key={o.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                      {fmtDateTime(o.created_at)}
                    </td>

                    <td style={{ padding: "10px 8px" }}>
                      <div style={{ fontWeight: 700 }}>{o.customer_name}</div>
                      <div style={{ opacity: 0.8, fontSize: 14 }}>{o.email}</div>
                      <div style={{ opacity: 0.55, fontSize: 12 }}>Order: {o.id}</div>
                    </td>

                    <td style={{ padding: "10px 8px" }}>
                      <div style={{ opacity: 0.9 }}>{o.phone ?? "—"}</div>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>
                        SMS opt-in: {o.sms_opt_in ? "Yes" : "No"}
                      </div>
                    </td>

                    <td style={{ padding: "10px 8px" }}>
                      <div style={{ fontWeight: 700 }}>{o.paid ? "Paid" : "Unpaid"}</div>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>{o.status}</div>
                    </td>

                    <td style={{ padding: "10px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {money(o.total_cents)}
                    </td>

                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                      <a href={receiptUrl} style={{ fontWeight: 700 }}>
                        Receipt
                      </a>

                      {o.stripe_session_id ? (
                        <>
                          <span style={{ opacity: 0.5 }}> · </span>
                          <span style={{ opacity: 0.75, fontSize: 13 }}>
                            Stripe session: {o.stripe_session_id}
                          </span>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}