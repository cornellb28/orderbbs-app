// src/app/admin/events/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminEvent = {
  id: string;
  title: string;
  pickup_date: string;
  pickup_start: string;
  pickup_end: string;
  location_name: string;
  location_address: string;
  deadline: string;
  is_active: boolean;
  created_at: string;
  stats: {
    orders_total: number;
    orders_paid: number;
    orders_unpaid: number;
    revenue_total_cents: number;
    revenue_paid_cents: number;
  };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(d: string) {
  const date = new Date(`${d}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function fmtTime(t: string) {
  const [hh = "00", mm = "00"] = t.split(":");
  const dt = new Date(`2000-01-01T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

type StatsRow = {
  event_id: string;
  orders_total: number | string | null;
  orders_paid: number | string | null;
  orders_unpaid: number | string | null;
  revenue_total_cents: number | string | null;
  revenue_paid_cents: number | string | null;
};

async function getEvents(): Promise<AdminEvent[]> {
  const supabase = await createSupabaseServerClient();

  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active,created_at"
    )
    .order("pickup_date", { ascending: false });

  if (error || !events) return [];

  // Stats via RPC (your function: admin_event_stats)
  const { data: statsRows, error: statsErr } = await supabase.rpc("admin_event_stats");

  // If stats RPC fails, still return events with empty stats
  if (statsErr) {
    return events.map((e) => ({
      ...e,
      stats: {
        orders_total: 0,
        orders_paid: 0,
        orders_unpaid: 0,
        revenue_total_cents: 0,
        revenue_paid_cents: 0,
      },
    })) as AdminEvent[];
  }

  const statsById = new Map<string, AdminEvent["stats"]>(
    ((statsRows ?? []) as StatsRow[]).map((r) => [
      r.event_id,
      {
        orders_total: Number(r.orders_total ?? 0),
        orders_paid: Number(r.orders_paid ?? 0),
        orders_unpaid: Number(r.orders_unpaid ?? 0),
        revenue_total_cents: Number(r.revenue_total_cents ?? 0),
        revenue_paid_cents: Number(r.revenue_paid_cents ?? 0),
      },
    ])
  );

  return events.map((e) => ({
    ...e,
    stats:
      statsById.get(e.id) ?? {
        orders_total: 0,
        orders_paid: 0,
        orders_unpaid: 0,
        revenue_total_cents: 0,
        revenue_paid_cents: 0,
      },
  })) as AdminEvent[];
}

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>Admin · Events</h1>

        <Link
          href="/admin/events/new"
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "#111",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          + New Event
        </Link>
      </div>

      <p style={{ opacity: 0.7 }}>
        Tip: “Activate” will make it the live drop (and deactivate all others).
      </p>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {events.map((e) => (
          <div
            key={e.id}
            style={{ border: "1px solid #eee", borderRadius: 12, padding: "12px 14px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 320, flex: "1 1 420px" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  {e.title}{" "}
                  {e.is_active ? (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "#e8fff0",
                        border: "1px solid #b7f0c9",
                      }}
                    >
                      ACTIVE
                    </span>
                  ) : null}
                </div>

                <div style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.6 }}>
                  <div>
                    <strong>Pickup:</strong> {fmtDate(e.pickup_date)} · {fmtTime(e.pickup_start)}–
                    {fmtTime(e.pickup_end)}
                  </div>
                  <div>
                    <strong>Deadline:</strong>{" "}
                    {new Date(e.deadline).toLocaleString("en-US", { timeZone: "America/Chicago" })}
                  </div>
                  <div>
                    <strong>Location:</strong> {e.location_name}
                  </div>
                  <div style={{ opacity: 0.7 }}>{e.location_address}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #eee",
                    background: "#fafafa",
                    fontWeight: 700,
                  }}
                >
                  Orders: {e.stats.orders_total} ({e.stats.orders_paid} paid / {e.stats.orders_unpaid} unpaid)
                </div>

                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #eee",
                    background: "#fafafa",
                    fontWeight: 700,
                  }}
                >
                  Revenue (paid): {money(e.stats.revenue_paid_cents)}
                </div>

                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #eee",
                    background: "#fafafa",
                    fontWeight: 700,
                  }}
                >
                  Revenue (total): {money(e.stats.revenue_total_cents)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {!e.is_active ? (
                  <form action={`/api/admin/events/${e.id}/activate`} method="post">
                    <button
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      Activate
                    </button>
                  </form>
                ) : null}

                <Link
                  href={`/admin/events/${e.id}`}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    textDecoration: "none",
                    fontWeight: 800,
                    color: "#111",
                  }}
                >
                  Edit
                </Link>

                <Link
                  href={`/admin/orders?event=${encodeURIComponent(e.id)}`}
                  style={{ fontWeight: 800, textDecoration: "none", alignSelf: "center" }}
                >
                  View Orders →
                </Link>
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 ? (
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: "14px" }}>
            No events yet. Create one.
          </div>
        ) : null}
      </div>
    </main>
  );
}