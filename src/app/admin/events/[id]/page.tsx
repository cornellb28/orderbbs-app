import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import EventEditClient from "./event-edit-client";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active")
    .eq("id", params.id)
    .maybeSingle();

  if (!event) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/admin/events">← Back</Link>
        <h1>Event not found</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <Link href="/admin/events">← Back</Link>
      <h1>Edit Event</h1>
      <EventEditClient event={event} />
    </main>
  );
}