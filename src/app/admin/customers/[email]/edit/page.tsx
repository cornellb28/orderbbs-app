import Link from "next/link";
import { headers } from "next/headers";
import CustomerEditForm from "./CustomerEditForm";

export const dynamic = "force-dynamic";

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

type CustomerDetail = {
  email: string;
  name: string | null;
  phone: string | null;
  sms_opt_in: boolean | null;
  vip: boolean;
  notes: string | null;
};

async function getCustomer(email: string): Promise<CustomerDetail | null> {
  const baseUrl = await getBaseUrl(); // ✅ await
  const res = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(email)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as CustomerDetail;
}

export default async function AdminCustomerEditPage({
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
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ marginTop: 0 }}>Edit Customer</h1>
      <div style={{ color: "#666", marginBottom: 12 }}>{customer.email}</div>

      <CustomerEditForm initial={customer} />
      <div>VIP: {customer.vip ? "Yes" : "No"}</div>
      <div style={{ marginTop: 14 }}>
        <Link href={`/admin/customers/${encodeURIComponent(customer.email)}`}>Cancel</Link>
      </div>
    </main>
  );
}