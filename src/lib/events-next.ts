import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NextDropEvent = {
  id: string;
  title: string;
  pickup_date: string;   // YYYY-MM-DD
  pickup_start: string;  // HH:MM:SS
  pickup_end: string;    // HH:MM:SS
  location_name: string;
  location_address: string;
  deadline: string;      // ISO string
  is_active: boolean;
};

function chicagoYMD(d: Date): string {
  // YYYY-MM-DD in America/Chicago
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function getNextDropEvent(): Promise<NextDropEvent | null> {
  const supabase = createSupabaseServerClient();

  const todayChicago = chicagoYMD(new Date());

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active"
    )
    .gte("pickup_date", todayChicago)
    .neq("is_active", true)
    .order("pickup_date", { ascending: true })
    .limit(1)
    .maybeSingle<NextDropEvent>();

  if (error || !data) return null;
  return data;
}
