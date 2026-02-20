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

  const menu = data.event_products
    .filter((ep) => ep.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ep) => ep.products);

  return { ...data, menu };
}
