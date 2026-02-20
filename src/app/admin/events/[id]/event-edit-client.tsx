"use client";

import { useState } from "react";

type AdminEvent = {
  id: string;
  title: string;
  pickup_date: string;
  pickup_start: string;
  pickup_end: string;
  location_name: string;
  location_address: string;
  deadline: string;
  is_active: boolean;
};

export default function EventEditClient({ event }: { event: AdminEvent }) {
  const [form, setForm] = useState({
    title: event.title,
    pickup_date: event.pickup_date,
    pickup_start: event.pickup_start.slice(0, 5),
    pickup_end: event.pickup_end.slice(0, 5),
    location_name: event.location_name,
    location_address: event.location_address,
    deadline: event.deadline,
  });

  async function save() {
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Save failed");
    alert("Saved ✅");
  }

  async function del() {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/events/${event.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Delete failed");
    window.location.href = "/admin/events";
  }

  async function activate() {
    const res = await fetch(`/api/admin/events/${event.id}/activate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Activate failed");
    window.location.href = "/admin/events";
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      <input type="date" value={form.pickup_date} onChange={(e) => setForm((f) => ({ ...f, pickup_date: e.target.value }))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input type="time" value={form.pickup_start} onChange={(e) => setForm((f) => ({ ...f, pickup_start: e.target.value }))} />
        <input type="time" value={form.pickup_end} onChange={(e) => setForm((f) => ({ ...f, pickup_end: e.target.value }))} />
      </div>
      <input value={form.location_name} onChange={(e) => setForm((f) => ({ ...f, location_name: e.target.value }))} />
      <input value={form.location_address} onChange={(e) => setForm((f) => ({ ...f, location_address: e.target.value }))} />
      <input value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
        <button onClick={save} style={{ padding: "10px 12px", borderRadius: 10, background: "#111", color: "#fff", border: "none", fontWeight: 800 }}>
          Save
        </button>

        {!event.is_active ? (
          <button onClick={activate} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontWeight: 800 }}>
            Activate
          </button>
        ) : null}

        <button onClick={del} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #f1b3b3", background: "#fff", fontWeight: 800, color: "#b00020" }}>
          Delete
        </button>
      </div>
    </div>
  );
}