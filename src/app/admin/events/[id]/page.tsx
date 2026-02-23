import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EventEditClient from "./event-edit-client";

export default async function AdminEventEditPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active")
    .eq("id", params.id)
    .single();

  if (error || !event) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/admin/events" style={{ textDecoration: "none" }}>← Back</Link>
        <h1>Event not found</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <Link href="/admin/events" style={{ textDecoration: "none" }}>← Back</Link>
      <h1>Edit Event</h1>
      <EventEditClient event={event as any} />
    </main>
  );
}