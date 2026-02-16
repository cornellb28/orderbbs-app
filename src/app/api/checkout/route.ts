import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CheckoutItem = { productId: string; quantity: number };
type CheckoutBody = {
  eventId: string;
  customer: { name: string; email: string; phone?: string; smsOptIn?: boolean };
  items: CheckoutItem[];
};

type DbEvent = {
  id: string;
  deadline: string; // timestamptz comes back as ISO string
  is_active: boolean;
};

type DbProduct = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  is_active: boolean;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function normalizePhoneToE164US(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function isCheckoutBody(value: unknown): value is CheckoutBody {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CheckoutBody>;

  if (typeof v.eventId !== "string") return false;
  if (!v.customer || typeof v.customer !== "object") return false;

  const c = v.customer as {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    smsOptIn?: unknown;
  };

  if (typeof c.name !== "string") return false;
  if (typeof c.email !== "string") return false;
  if (c.phone !== undefined && typeof c.phone !== "string") return false;
  if (c.smsOptIn !== undefined && typeof c.smsOptIn !== "boolean") return false;

  if (!Array.isArray(v.items) || v.items.length === 0) return false;

  for (const it of v.items as unknown[]) {
    if (!it || typeof it !== "object") return false;
    const item = it as { productId?: unknown; quantity?: unknown };
    if (typeof item.productId !== "string") return false;
    if (typeof item.quantity !== "number") return false;
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const origin =
      req.headers.get("origin") ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
      new URL(req.url).origin;

    const body: unknown = await req.json();
    if (!isCheckoutBody(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { eventId, customer, items } = body;

    // ✅ Normalize phone + enforce rules for SMS opt-in
    const phoneRaw = (customer.phone ?? "").trim();
    const phoneNormalized = phoneRaw ? normalizePhoneToE164US(phoneRaw) : null;

    if (customer.smsOptIn === true && !phoneNormalized) {
      return NextResponse.json(
        { error: "Please enter a valid US phone number to receive SMS reminders." },
        { status: 400 }
      );
    }

    // If they typed a phone but it’s invalid, reject (keeps DB clean)
    if (phoneRaw && !phoneNormalized) {
      return NextResponse.json(
        { error: "Phone number must be a valid US number (10 digits)." },
        { status: 400 }
      );
    }

    // Merge duplicate productIds (defensive)
    const qtyByProductId = new Map<string, number>();
    for (const it of items) {
      qtyByProductId.set(it.productId, (qtyByProductId.get(it.productId) ?? 0) + it.quantity);
    }

    const mergedItems: CheckoutItem[] = Array.from(qtyByProductId.entries()).map(
      ([productId, quantity]) => ({ productId, quantity })
    );

    const supabase = createSupabaseServerClient();

    // 1) Validate event is active + not past deadline
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, deadline, is_active")
      .eq("id", eventId)
      .limit(1)
      .maybeSingle<DbEvent>();

    if (eventErr || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!event.is_active) {
      return NextResponse.json({ error: "Preorders are closed for this event" }, { status: 400 });
    }

    const deadlineMs = Date.parse(event.deadline);
    if (Number.isNaN(deadlineMs) || Date.now() > deadlineMs) {
      return NextResponse.json({ error: "Order deadline has passed" }, { status: 400 });
    }

    // 2) Validate requested products are allowed for this event
    const productIds = [...new Set(mergedItems.map((i) => i.productId))];

    const { data: allowed, error: allowedErr } = await supabase
      .from("event_products")
      .select("product_id")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .in("product_id", productIds);

    if (allowedErr) {
      return NextResponse.json({ error: "Failed to validate menu" }, { status: 500 });
    }

    const allowedSet = new Set((allowed ?? []).map((r: { product_id: string }) => r.product_id));
    const disallowed = productIds.filter((id) => !allowedSet.has(id));
    if (disallowed.length) {
      return NextResponse.json(
        { error: "One or more items are not available for this event" },
        { status: 400 }
      );
    }

    // 3) Fetch authoritative product details + prices
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, description, price_cents, is_active")
      .in("id", productIds)
      .eq("is_active", true);

    if (prodErr || !products?.length) {
      return NextResponse.json({ error: "Products not found" }, { status: 400 });
    }

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products are invalid" }, { status: 400 });
    }

    const productMap = new Map<string, DbProduct>();
    for (const p of products as DbProduct[]) productMap.set(p.id, p);

    // 4) Build server-trusted line items
    const lineItems = mergedItems.map((i) => {
      const p = productMap.get(i.productId);
      if (!p) throw new Error("Invalid product in cart");

      return {
        productId: p.id,
        name: p.name,
        unit_amount: p.price_cents,
        quantity: i.quantity,
        line_total: p.price_cents * i.quantity,
      };
    });

    const totalCents = lineItems.reduce((sum, li) => sum + li.line_total, 0);
    if (totalCents <= 0) {
      return NextResponse.json({ error: "Invalid total" }, { status: 400 });
    }

    // 5) Create ORDER in Supabase (pending)
    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .insert({
        event_id: eventId,
        customer_name: customer.name,
        email: customer.email,
        phone: phoneNormalized, // ✅ store normalized E.164
        sms_opt_in: customer.smsOptIn === true,
        total_cents: totalCents,
        paid: false,
        status: "pending",
      })
      .select("id")
      .single<{ id: string }>();

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const orderId = orderRow.id;

    // 6) Create ORDER ITEMS in Supabase
    const { error: itemsErr } = await supabase.from("order_items").insert(
      lineItems.map((li) => ({
        order_id: orderId,
        product_id: li.productId,
        qty: li.quantity,
        unit_price_cents: li.unit_amount,
        line_total_cents: li.line_total,
      }))
    );

    if (itemsErr) {
      return NextResponse.json({ error: "Failed to create order items" }, { status: 500 });
    }

    // 7) Create Stripe Checkout Session using server-trusted prices
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      customer_email: customer.email,

      line_items: lineItems.map((li) => ({
        quantity: li.quantity,
        price_data: {
          currency: "usd",
          unit_amount: li.unit_amount,
          product_data: { name: li.name },
        },
      })),

      metadata: {
        orderId,
        eventId,
        customerName: customer.name,
        customerPhone: phoneNormalized ?? "", // ✅ normalized
        smsOptIn: customer.smsOptIn === true ? "true" : "false",
      },

      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/canceled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe session URL missing" }, { status: 500 });
    }

    // 8) Store stripe_session_id on the order
    const { error: updErr } = await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderId);

    if (updErr) {
      return NextResponse.json({ error: "Failed to link Stripe session" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: unknown) {
    console.error("Checkout error:", getErrorMessage(err));
    return NextResponse.json(
      { error: getErrorMessage(err) || "Checkout failed" },
      { status: 500 }
    );
  }
}
