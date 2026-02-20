import Link from "next/link";

export default function NewEventPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <Link href="/admin/events" style={{ textDecoration: "none" }}>← Back</Link>
      <h1>Create Event</h1>

      <form action="/api/admin/events" method="post" style={{ display: "grid", gap: 10 }}>
        <input name="title" placeholder="Title" required />
        <input name="pickup_date" type="date" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input name="pickup_start" type="time" required />
          <input name="pickup_end" type="time" required />
        </div>
        <input name="location_name" placeholder="Location name" required />
        <input name="location_address" placeholder="Location address" required />
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Order deadline (America/Chicago)</span>
          <input name="deadline" type="datetime-local" required />
        </label>

        <button style={{ padding: "12px 14px", borderRadius: 10, background: "#111", color: "#fff", border: "none", fontWeight: 800 }}>
          Create
        </button>
      </form>

      <p style={{ opacity: 0.7, marginTop: 12 }}>
        After creating, go back and click “Activate” to make it live.
      </p>
    </main>
  );
}