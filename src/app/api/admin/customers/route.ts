import { NextResponse } from "next/server";
import { requireAdminOr401 } from "@/lib/admin-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type OrderRow = {
  customer_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  paid: boolean;
  status: string;
  sms_opt_in: boolean | null;
};

type SubscriberRow = {
  name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
};

type ProfileRow = {
  email: string;
  name: string | null;
  phone: string | null;
  sms_opt_in: boolean | null;
  vip: boolean;
  updated_at: string;
};

type UnifiedCustomer = {
  email: string;
  name: string | null;
  phone: string | null;

  sms_opt_in: boolean | null;

  first_seen: string | null;
  last_seen: string | null;

  // flags for filters
  ordered: boolean;
  subscribed: boolean;
  vip: boolean;

  // optional: latest order snapshot (nice for admin)
  last_order_status: string | null;
  last_order_paid: boolean | null;
};

function normEmail(v: string | null | undefined) {
  return (v ?? "").toLowerCase().trim();
}

function normPhone(v: string | null | undefined) {
  return (v ?? "").replace(/\D/g, ""); // digits only for searching
}

export async function GET(req: Request) {
  const admin = await requireAdminOr401();
  if (!admin.ok) return admin.res;

  const supabase = createSupabaseAdminClient();

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const fOrdered = url.searchParams.get("ordered") === "1";
  const fSubscribed = url.searchParams.get("subscribed") === "1";
  const fVip = url.searchParams.get("vip") === "1";

  // A) orders (sorted DESC so first is latest)
  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select("customer_name,email,phone,created_at,paid,status,sms_opt_in")
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>();

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  // B) subscribers
  const { data: subs, error: sErr } = await supabase
    .from("subscribers")
    .select("name,email,phone,created_at")
    .order("created_at", { ascending: false })
    .returns<SubscriberRow[]>();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // C) profiles (editable + VIP)
  const { data: profiles, error: pErr } = await supabase
    .from("customer_profiles")
    .select("email,name,phone,sms_opt_in,vip,updated_at")
    .order("updated_at", { ascending: false })
    .returns<ProfileRow[]>();

  console.log("profiles err:", pErr);
  console.log("profiles count:", profiles?.length);
  console.log("profiles sample:", profiles?.[0]);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Build unified map
  const map = new Map<string, UnifiedCustomer>();

  // 1) Start with profiles (highest priority for editable fields)
  for (const p of profiles ?? []) {
    const email = normEmail(p.email);
    if (!email) continue;

    map.set(email, {
      email,
      name: p.name ?? null,
      phone: p.phone ?? null,
      sms_opt_in: p.sms_opt_in ?? null,
      first_seen: null,
      last_seen: p.updated_at ?? null,

      ordered: false,
      subscribed: false,
      vip: p.vip === true,

      last_order_status: null,
      last_order_paid: null,
    });
  }

  // 2) Merge subscribers (fill blanks, mark subscribed)
  for (const s of subs ?? []) {
    const email = normEmail(s.email);
    if (!email) continue;

    const existing = map.get(email);
    if (!existing) {
      map.set(email, {
        email,
        name: s.name ?? null,
        phone: s.phone ?? null,
        sms_opt_in: null,
        first_seen: s.created_at ?? null,
        last_seen: s.created_at ?? null,

        ordered: false,
        subscribed: true,
        vip: false,

        last_order_status: null,
        last_order_paid: null,
      });
    } else {
      map.set(email, {
        ...existing,
        name: existing.name ?? s.name ?? null,
        phone: existing.phone ?? s.phone ?? null,
        subscribed: true,
        // keep last_seen as max(existing.last_seen, s.created_at)
        last_seen:
          !existing.last_seen
            ? s.created_at ?? null
            : s.created_at && s.created_at > existing.last_seen
              ? s.created_at
              : existing.last_seen,
        first_seen: existing.first_seen ?? s.created_at ?? null,
      });
    }
  }

  // 3) Merge orders (latest snapshot + mark ordered, compute first_seen)
  // Because orders are sorted DESC, first time we see email is latest order.
  const firstSeenByEmail = new Map<string, string>();

  // Walk ASC-ish for first_seen: easiest is compute min while iterating all orders
  for (const o of orders ?? []) {
    const email = normEmail(o.email);
    if (!email) continue;

    const prev = firstSeenByEmail.get(email);
    if (!prev || o.created_at < prev) firstSeenByEmail.set(email, o.created_at);
  }

  const latestOrderSeen = new Set<string>();

  for (const o of orders ?? []) {
    const email = normEmail(o.email);
    if (!email) continue;

    const existing = map.get(email);
    const first_seen = firstSeenByEmail.get(email) ?? null;

    if (!existing) {
      // customer exists only via orders
      const sms = o.sms_opt_in === true;

      map.set(email, {
        email,
        name: o.customer_name ?? null,
        phone: o.phone ?? null,
        sms_opt_in: sms,

        first_seen,
        last_seen: o.created_at ?? null,

        ordered: true,
        subscribed: false,
        vip: false,

        last_order_status: o.status ?? null,
        last_order_paid: o.paid ?? null,
      });
      latestOrderSeen.add(email);
      continue;
    }

    // update first_seen
    const mergedFirstSeen = existing.first_seen ?? first_seen;

    // only set latest-order fields once (DESC order)
    if (!latestOrderSeen.has(email)) {
      map.set(email, {
        ...existing,
        ordered: true,
        first_seen: mergedFirstSeen,
        last_seen:
          !existing.last_seen
            ? o.created_at ?? null
            : o.created_at && o.created_at > existing.last_seen
              ? o.created_at
              : existing.last_seen,

        // if profile didn't override sms_opt_in, we can take latest order
        sms_opt_in: existing.sms_opt_in ?? (o.sms_opt_in === true),

        last_order_status: o.status ?? null,
        last_order_paid: o.paid ?? null,
      });
      latestOrderSeen.add(email);
    } else {
      // already set latest snapshot, just ensure ordered + first_seen exist
      map.set(email, {
        ...existing,
        ordered: true,
        first_seen: mergedFirstSeen,
      });
    }
  }

  // Convert, then filter
  let customers = Array.from(map.values());

  // Filters
  if (fOrdered) customers = customers.filter((c) => c.ordered);
  if (fSubscribed) customers = customers.filter((c) => c.subscribed);
  if (fVip) customers = customers.filter((c) => c.vip);

  // Search (name/email/phone)
  if (search) {
    const sDigits = search.replace(/\D/g, "");
    customers = customers.filter((c) => {
      const name = (c.name ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      const phoneDigits = normPhone(c.phone);

      if (name.includes(search)) return true;
      if (email.includes(search)) return true;

      // if user typed digits, match digits-only phone
      if (sDigits && phoneDigits.includes(sDigits)) return true;

      // also allow raw contains match for non-digit input
      if ((c.phone ?? "").toLowerCase().includes(search)) return true;

      return false;
    });
  }

  // Sort: most recently seen first
  customers.sort((a, b) => (b.last_seen ?? "").localeCompare(a.last_seen ?? ""));

  return NextResponse.json({ customers });
}