"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

function toDatetimeLocal(isoOrDate: string) {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function makeFormFromEvent(event: AdminEvent) {
  return {
    title: event.title ?? "",
    pickup_date: event.pickup_date ?? "",
    pickup_start: (event.pickup_start ?? "").slice(0, 5),
    pickup_end: (event.pickup_end ?? "").slice(0, 5),
    location_name: event.location_name ?? "",
    location_address: event.location_address ?? "",
    deadline: toDatetimeLocal(event.deadline),
  };
}

export default function EventEditClient({ event }: { event: AdminEvent }) {
  const router = useRouter();
  const initial = useMemo(() => makeFormFromEvent(event), [event.id]); // init once per event id
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    try {
      setBusy(true);

      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deadline: new Date(form.deadline).toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || "Save failed");

      if (data?.event) setForm(makeFormFromEvent(data.event));

      // ✅ Redirect back to events list
      router.push("/admin/events");
      router.refresh(); // optional, but ensures fresh data
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        disabled={busy}
      />

      <input
        type="date"
        value={form.pickup_date}
        onChange={(e) => setForm((f) => ({ ...f, pickup_date: e.target.value }))}
        disabled={busy}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input
          type="time"
          value={form.pickup_start}
          onChange={(e) => setForm((f) => ({ ...f, pickup_start: e.target.value }))}
          disabled={busy}
        />
        <input
          type="time"
          value={form.pickup_end}
          onChange={(e) => setForm((f) => ({ ...f, pickup_end: e.target.value }))}
          disabled={busy}
        />
      </div>

      <input
        value={form.location_name}
        onChange={(e) => setForm((f) => ({ ...f, location_name: e.target.value }))}
        disabled={busy}
      />

      <input
        value={form.location_address}
        onChange={(e) => setForm((f) => ({ ...f, location_address: e.target.value }))}
        disabled={busy}
      />

      <input
        type="datetime-local"
        value={form.deadline}
        onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
        disabled={busy}
      />

      <button onClick={save} disabled={busy}>
        {busy ? "Saving..." : "Save"}
      </button>
    </div>
  );
}