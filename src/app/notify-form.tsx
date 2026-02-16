"use client";

import { useState } from "react";

export default function NotifyForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const canSubmit = email.includes("@") && status !== "loading";
  const normalizedPhone = phone.replace(/\D/g, "");


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setMessage("");

    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || null,
        email,
        phone: normalizedPhone,
        smsOptIn,
      }),
    });

    const data: { ok?: boolean; error?: string } = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Something went wrong.");
      return;
    }

    setStatus("success");
    setMessage(
      "You’re on the list — we’ll let you know when the next drop opens."
    );

    setName("");
    setEmail("");
    setPhone("");
    setSmsOptIn(false);
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}
    >
      <input
        type="text"
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        type="email"
        placeholder="Email (required)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="tel"
        placeholder="Phone (optional, US)"
        value={phone}
        onChange={(e) => {
          const val = e.target.value;
          setPhone(val);
          if (!val.trim()) setSmsOptIn(false);
        }}
      />

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          fontSize: 14,
          opacity: phone ? 0.9 : 0.5,
        }}
      >
        <input
          type="checkbox"
          checked={smsOptIn}
          disabled={!phone.trim()}
          onChange={(e) => setSmsOptIn(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span>
          Text me when preorders open. Msg &amp; data rates may apply. Reply STOP
          to opt out.
        </span>
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          padding: "0.9rem 1.2rem",
          background: canSubmit ? "black" : "#999",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontWeight: 700,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {status === "loading" ? "Joining..." : "Notify me for the next drop"}
      </button>

      {message ? (
        <p style={{ margin: 0, opacity: status === "error" ? 1 : 0.8 }}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
