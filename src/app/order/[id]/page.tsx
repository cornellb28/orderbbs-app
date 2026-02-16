import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = { t?: string };

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

    const supabase = createSupabaseServerClient();

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
        .maybeSingle();

    if (error || !data) {
        return (
            <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
                <h1>Order Receipt</h1>
                <p>Order not found (or link is invalid).</p>
            </main>
        );
    }

    const items = (data.order_items ?? []).map((it: any) => ({
        qty: it.qty as number,
        name: (it.products?.name ?? "Item") as string,
        lineTotal: it.line_total_cents as number,
    }));

    const icsUrl = `/order/${params.id}/calendar?t=${token}`;

    const googleDates = `${data.events.pickup_date.replaceAll("-", "")}T${data.events.pickup_start
        .slice(0, 5)
        .replace(":", "")}00/${data.events.pickup_date.replaceAll("-", "")}T${data.events.pickup_end
            .slice(0, 5)
            .replace(":", "")}00`;

    const googleUrl =
        `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(`Pickup — ${data.events.title}`)}` +
        `&dates=${encodeURIComponent(googleDates)}` +
        `&ctz=${encodeURIComponent("America/Chicago")}` +
        `&location=${encodeURIComponent(
            `${data.events.location_name} — ${data.events.location_address}`
        )}` +
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
                <strong>{data.events.title}</strong>
                <br />
                {data.events.pickup_date} · {data.events.pickup_start}–{data.events.pickup_end}
                <br />
                {data.events.location_name}
                <br />
                <span style={{ opacity: 0.8 }}>{data.events.location_address}</span>
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
