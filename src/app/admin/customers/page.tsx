import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type UnifiedCustomer = {
  email: string;
  name: string | null;
  phone: string | null;
  sms_opt_in: boolean | null;

  first_seen: string | null;
  last_seen: string | null;

  ordered: boolean;
  subscribed: boolean;
  vip: boolean;

  last_order_status: string | null;
  last_order_paid: boolean | null;
};

function fmtChicago(iso: string) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago" });
}

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

async function getCustomers(params: {
  search?: string;
  ordered?: boolean;
  subscribed?: boolean;
  vip?: boolean;
}): Promise<UnifiedCustomer[]> {
  const baseUrl = await getBaseUrl();
  const qs = new URLSearchParams();

  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.ordered) qs.set("ordered", "1");
  if (params.subscribed) qs.set("subscribed", "1");
  if (params.vip) qs.set("vip", "1");

  const res = await fetch(`${baseUrl}/api/admin/customers?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];

  const data = (await res.json()) as { customers?: UnifiedCustomer[] };
  return data.customers ?? [];
}

const hrefCustomer = (email: string) => `/admin/customers/${encodeURIComponent(email)}`;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const search = typeof searchParams?.search === "string" ? searchParams.search : "";
  const ordered = searchParams?.ordered === "1";
  const subscribed = searchParams?.subscribed === "1";
  const vip = searchParams?.vip === "1";

  const customers = await getCustomers({ search, ordered, subscribed, vip });

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ marginTop: 0 }}>Admin · Customers</h1>

      {/* Filters + Search */}
      <form method="GET" style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name, email, phone…"
          style={{
            flex: "1 1 320px",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="ordered" value="1" defaultChecked={ordered} />
          Ordered
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="subscribed" value="1" defaultChecked={subscribed} />
          Subscribed
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="vip" value="1" defaultChecked={vip} />
          VIP
        </label>

        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
          }}
        >
          Apply
        </button>

        <Link
          href="/admin/customers"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Reset
        </Link>
      </form>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ marginBottom: 8 }}>All Customers</h2>
          <div style={{ color: "#666", fontSize: 13 }}>{customers.length} results</div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10 }}>Name</th>
                <th style={{ textAlign: "left", padding: 10 }}>Email</th>
                <th style={{ textAlign: "left", padding: 10 }}>Phone</th>
                <th style={{ textAlign: "left", padding: 10 }}>Flags</th>
                <th style={{ textAlign: "left", padding: 10 }}>Last Seen</th>
                <th style={{ textAlign: "left", padding: 10 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((c) => (
                <tr key={c.email} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{c.name ?? "—"}</td>
                  <td style={{ padding: 10 }}>{c.email}</td>
                  <td style={{ padding: 10 }}>{c.phone ?? "—"}</td>

                  <td style={{ padding: 10 }}>
                    <span style={{ marginRight: 8 }}>{c.ordered ? "Ordered" : ""}</span>
                    <span style={{ marginRight: 8 }}>{c.subscribed ? "Subscribed" : ""}</span>
                    <span>{c.vip ? "VIP" : ""}</span>
                  </td>

                  <td style={{ padding: 10 }}>{c.last_seen ? fmtChicago(c.last_seen) : "—"}</td>

                  <td style={{ padding: 10, display: "flex", gap: 10 }}>
                    <Link href={hrefCustomer(c.email)}>View</Link>
                    <Link href={`${hrefCustomer(c.email)}/edit`}>Edit</Link>
                  </td>
                </tr>
              ))}

              {customers.length === 0 ? (
                <tr>
                  <td style={{ padding: 12 }} colSpan={6}>
                    No matching customers.
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