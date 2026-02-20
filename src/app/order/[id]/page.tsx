import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = { t?: string };

type DbEvent = {
    title: string;
    pickup_date: string;
    pickup_start: string;
    pickup_end: string;
    location_name: string;
    location_address: string;
};

type DbOrderItem = {
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
    products: { name: string } | null;
};

type DbOrderRow = {
    id: string;
    status: string;
    paid: boolean;
    total_cents: number;
    customer_name: string;
    email: string;
    created_at: string;
    public_token: string;
    events: DbEvent | DbEvent[] | null;
    order_items: DbOrderItem[] | null;
};

function getSingleEvent(events: DbOrderRow["events"]): DbEvent | null {
    if (!events) return null;
    return Array.isArray(events) ? events[0] ?? null : events;
}

export default async function OrderPage({
    params,
    searchParams,
}: {
    params: { id: string };
    searchParams: Promise<SearchParams>;
}) {
    const sp = await searchParams;
    const token = sp.t;

    if (!token) {
        return (
            <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
                <h1>Order Receipt</h1>
                <p>Missing access token.</p>
            </main>
        );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("orders")
        .select(`
      id,
      status,
      paid,
      total_cents,
      customer_name,
      email,
      created_at,
      public_token,
      events (
        title,
        pickup_date,
        pickup_start,
        pickup_end,
        location_name,
        location_address
      ),
      order_items (
        qty,
        unit_price_cents,
        line_total_cents,
        products ( name )
      )
    `)
        .eq("id", params.id)
        .eq("public_token", token)
        .maybeSingle<DbOrderRow>();

    if (error || !data) {
        return (
            <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
                <h1>Order Receipt</h1>
                <p>Order not found (or link is invalid).</p>
            </main>
        );
    }

    const evt = getSingleEvent(data.events);
    if (!evt) {
        return (
            <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
                <h1>Order Receipt</h1>
                <p>Event not found for this order.</p>
            </main>
        );
    }

    const items = (data.order_items ?? []).map((it) => ({
        qty: it.qty as number,
        name: (it.products?.name ?? "Item") as string,
        lineTotal: it.line_total_cents as number,
    }));

    // NOTE: keep your folder name consistent:
    // if your route is /order/[id]/calender, use that path;
    // if you renamed to /calendar, use /calendar.
    const icsUrl = `/order/${params.id}/calendar?t=${encodeURIComponent(token)}`;

    const startYmd = evt.pickup_date.replaceAll("-", "");
    const startHm = evt.pickup_start.slice(0, 5).replace(":", "");
    const endYmd = evt.pickup_date.replaceAll("-", "");
    const endHm = evt.pickup_end.slice(0, 5).replace(":", "");

    const googleDates = `${startYmd}T${startHm}00/${endYmd}T${endHm}00`;

    const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(`Pickup — ${evt.title}`)}` +
    `&dates=${encodeURIComponent(googleDates)}` +
    `&ctz=${encodeURIComponent("America/Chicago")}` +
    `&location=${encodeURIComponent(`${evt.location_name} — ${evt.location_address}`)}` +
    `&details=${encodeURIComponent(`Order ${data.id} pickup for Bowl & Broth Society.`)}`;


    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
            <h1>Order Receipt ✅</h1>

            <p style={{ opacity: 0.8 }}>
                Order: <strong>{data.id}</strong>
                <br />
                {data.customer_name} · {data.email}
                <br />
                Status: <strong>{data.paid ? "Paid" : "Unpaid"}</strong> · {data.status}
            </p>

            <h2 style={{ marginTop: "1.5rem" }}>Pickup</h2>
            <p>
                <strong>{evt.title}</strong>
                <br />
                {evt.pickup_date} · {evt.pickup_start}–{evt.pickup_end}
                <br />
                {evt.location_name}
                <br />
                <span style={{ opacity: 0.8 }}>{evt.location_address}</span>
            </p>

            <h2 style={{ marginTop: "1.5rem" }}>Items</h2>
            <ul>
                {items.map((it, idx) => (
                    <li key={idx}>
                        {it.qty}× {it.name} — ${(it.lineTotal / 100).toFixed(2)}
                    </li>
                ))}
            </ul>

            <p style={{ marginTop: "1rem", fontWeight: 700 }}>
                Total: ${(data.total_cents / 100).toFixed(2)}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <a
                    href={icsUrl}
                    style={{
                        display: "inline-block",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        textDecoration: "none",
                        fontWeight: 700,
                        color: "#111",
                        background: "#fff",
                    }}
                >
                    Add to Calendar (.ics)
                </a>

                <a
                    href={googleUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        display: "inline-block",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "none",
                        textDecoration: "none",
                        fontWeight: 700,
                        color: "#fff",
                        background: "#111",
                    }}
                >
                    Add to Google Calendar
                </a>
            </div>

        </main>
    );
}
