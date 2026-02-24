"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CustomerDetail = {
  email: string;
  name: string | null;
  phone: string | null;
  sms_opt_in: boolean | null;
  vip: boolean;             // ✅ add
  notes: string | null;
};

export default function CustomerEditForm({ initial }: { initial: CustomerDetail }) {
  const router = useRouter();

  const [name, setName] = useState(initial.name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [smsOptIn, setSmsOptIn] = useState<boolean>(initial.sms_opt_in ?? false);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [vip, setVip] = useState<boolean>(initial.vip ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(initial.email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          phone: phone.trim() || null,
          sms_opt_in: smsOptIn,
          vip,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to update customer.");
      }

      router.push(`/admin/customers/${encodeURIComponent(initial.email)}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Phone</div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={smsOptIn}
          onChange={(e) => setSmsOptIn(e.target.checked)}
        />
        SMS opt-in
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} />
        VIP
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", resize: "vertical" }}
        />
      </label>

      {error ? <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div> : null}

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          background: "white",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}