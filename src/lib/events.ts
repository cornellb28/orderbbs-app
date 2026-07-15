import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventWithRelations, EventWithMenu } from "./types";

export async function getActiveEventWithMenu(): Promise<EventWithMenu | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      pickup_date,
      pickup_start,
      pickup_end,
      location_name,
      location_address,
      deadline,
      event_products (
        sort_order,
        is_active,
        products (
          id,
          name,
          description,
          price_cents
        )
      )
    `)
    .eq("is_active", true)
    .order("pickup_date", { ascending: true })
    .limit(1)
    .maybeSingle<EventWithRelations>();

  if (error || !data) {
    console.error("Active event query error:", error?.message);
    return null;
  }

  const menu = (data.event_products ?? [])
    .filter((ep) => ep.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ep) => ep.products)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return { ...data, menu };
}

// Fallback for when no event is currently active: the most recent drop's
// menu, shown read-only so /preorder never fully blocks on an empty state.
export async function getLastEventWithMenu(): Promise<EventWithMenu | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      pickup_date,
      pickup_start,
      pickup_end,
      location_name,
      location_address,
      deadline,
      event_products (
        sort_order,
        is_active,
        products (
          id,
          name,
          description,
          price_cents
        )
      )
    `)
    .order("pickup_date", { ascending: false })
    .limit(1)
    .maybeSingle<EventWithRelations>();

  if (error || !data) {
    return null;
  }

  const menu = (data.event_products ?? [])
    .filter((ep) => ep.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ep) => ep.products)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return { ...data, menu };
}
