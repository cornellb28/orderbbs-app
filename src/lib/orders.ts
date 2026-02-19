import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrderSummary = {
  id: string;
  status: string;
  paid: boolean;
  total_cents: number;
  customer_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  public_token: string;

  event: {
    title: string;
    pickup_date: string;
    pickup_start: string;
    pickup_end: string;
    location_name: string;
    location_address: string;
  };

  items: Array<{
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
    product: { name: string };
  }>;
};

type DbEvent = OrderSummary["event"];

type DbOrderItem = {
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  products: { name: string } | null;
};

type DbOrderRow = {
  id: string;
  public_token: string;
  status: string;
  paid: boolean;
  total_cents: number;
  customer_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  events: DbEvent | DbEvent[] | null;
  order_items: DbOrderItem[] | null;
};

function getSingleEvent(events: DbOrderRow["events"]): DbEvent | null {
  if (!events) return null;
  return Array.isArray(events) ? events[0] ?? null : events;
}

export async function getOrderSummary(orderId: string): Promise<OrderSummary | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      public_token,
      status,
      paid,
      total_cents,
      customer_name,
      email,
      phone,
      created_at,
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
    .eq("id", orderId)
    .maybeSingle<DbOrderRow>();

  if (error || !data) return null;

  const event = getSingleEvent(data.events);
  if (!event) return null;

  return {
    id: data.id,
    status: data.status,
    paid: data.paid,
    total_cents: data.total_cents,
    customer_name: data.customer_name,
    public_token: data.public_token,
    email: data.email,
    phone: data.phone,
    created_at: data.created_at,
    event,
    items: (data.order_items ?? []).map((it) => ({
      qty: it.qty,
      unit_price_cents: it.unit_price_cents,
      line_total_cents: it.line_total_cents,
      product: { name: it.products?.name ?? "Item" },
    })),
  };
}


