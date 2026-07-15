"use client";

import { useMemo, useState } from "react";
import type { EventWithMenu, Product } from "@/lib/types";
import type { NextDropEvent } from "@/lib/events-next";

type Props = {
  event: EventWithMenu;
  isOpen?: boolean;
  nextDrop?: NextDropEvent | null;
};

function formatPickupDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatPickupTime(timeStr: string) {
  const [hh = "00", mm = "00"] = timeStr.split(":");
  const d = new Date(`2000-01-01T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

type CustomerForm = {
  name: string;
  email: string;
  phone: string; // store digits only (US) e.g. 2145551234 or 12145551234
};

function formatUSPhoneForDisplay(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 11);

  // If starts with 1, treat as country code
  const d = digits.startsWith("1") ? digits.slice(1) : digits;

  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 10);

  if (!a) return "";
  if (a.length < 3) return a;
  if (!b) return `(${a}) `;
  if (b.length < 3) return `(${a}) ${b}`;
  if (!c) return `(${a}) ${b}-`;
  return `(${a}) ${b}-${c}`;
}

function isValidUSPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

export default function PreorderClient({ event, isOpen = true, nextDrop = null }: Props) {
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    email: "",
    phone: "",
  });

  function inc(id: string) {
    setQtyById((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function dec(id: string) {
    setQtyById((prev) => {
      const next = { ...prev };
      const current = next[id] ?? 0;
      const updated = Math.max(0, current - 1);
      if (updated === 0) delete next[id];
      else next[id] = updated;
      return next;
    });
  }

  const cartItems = useMemo(() => {
    return event.menu
      .map((p) => ({ ...p, qty: qtyById[p.id] ?? 0 }))
      .filter((p) => p.qty > 0);
  }, [event.menu, qtyById]);

  const totalCents = useMemo(() => {
    return cartItems.reduce((sum, p) => sum + p.price_cents * p.qty, 0);
  }, [cartItems]);

  const isCustomerValid = customer.name.trim().length > 0 && customer.email.includes("@");

  async function checkout() {
    if (!cartItems.length || !isCustomerValid) return;

    if (smsOptIn && !isValidUSPhone(customer.phone)) {
      setPhoneError("Enter a valid US phone number (10 digits) to get SMS reminders.");
      return;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        customer: { ...customer, smsOptIn },
        items: cartItems.map((p) => ({
          productId: p.id,
          quantity: p.qty,
        })),
      }),
    });

    const data: { url?: string; error?: string } = await res.json();

    if (!res.ok || !data.url) {
      alert(data.error || "Checkout failed");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{event.title}</h1>

      <p style={{ marginBottom: "1.5rem", opacity: 0.8 }}>
        Pickup: {event.pickup_date} · {event.pickup_start}–{event.pickup_end}
        <br />
        {event.location_name}
      </p>

      {!isOpen ? (
        <div
          style={{
            padding: "1rem 1.25rem",
            border: "1px solid #eee",
            borderRadius: 10,
            background: "#fafafa",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Ordering Closed</div>
          <div style={{ opacity: 0.85, lineHeight: 1.6 }}>
            {nextDrop
              ? <>
                  Ordering opens again for the next drop: {formatPickupDate(nextDrop.pickup_date)} ·{" "}
                  {formatPickupTime(nextDrop.pickup_start)}–{formatPickupTime(nextDrop.pickup_end)} at{" "}
                  {nextDrop.location_name}.
                </>
              : "Next drop date will be posted soon."}
          </div>
          <div style={{ opacity: 0.7, fontSize: 13, marginTop: 6 }}>
            Browsing the menu from the most recent drop below.
          </div>
        </div>
      ) : null}

      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Menu</h2>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {event.menu.map((p: Product) => {
          const qty = qtyById[p.id] ?? 0;
          return (
            <li
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                {p.description ? (
                  <div style={{ fontSize: "0.9rem", opacity: 0.75 }}>{p.description}</div>
                ) : null}
                <div style={{ marginTop: 4 }}>${(p.price_cents / 100).toFixed(2)}</div>
              </div>

              {isOpen ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => dec(p.id)}>-</button>
                  <span style={{ minWidth: 24, textAlign: "center" }}>{qty}</span>
                  <button onClick={() => inc(p.id)}>+</button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {isOpen ? (
        <>
      <h2 style={{ marginTop: "2rem", marginBottom: "0.75rem" }}>Customer Info</h2>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <input
          type="text"
          placeholder="Full Name"
          value={customer.name}
          onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={customer.email}
          onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
          required
        />

        <input
          type="tel"
          placeholder="Phone (optional)"
          value={formatUSPhoneForDisplay(customer.phone)}
          onChange={(e) => {
            const raw = e.target.value;
            const digitsOnly = raw.replace(/\D/g, "").slice(0, 11);

            setCustomer((c) => ({ ...c, phone: digitsOnly }));

            if (!digitsOnly.trim()) {
              setSmsOptIn(false);
              setPhoneError(null);
              return;
            }

            if (smsOptIn && !isValidUSPhone(digitsOnly)) {
              setPhoneError("Enter a valid US phone number (10 digits).");
            } else {
              setPhoneError(null);
            }
          }}
        />

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, opacity: 0.9 }}>
            <input
              type="checkbox"
              checked={smsOptIn}
              disabled={!customer.phone.trim() || !isValidUSPhone(customer.phone)}
              onChange={(e) => {
                const next = e.target.checked;

                if (next && !isValidUSPhone(customer.phone)) {
                  setPhoneError("Enter a valid US phone number (10 digits) to get SMS reminders.");
                  return;
                }

                setSmsOptIn(next);
                setPhoneError(null);
              }}
              style={{ marginTop: 3 }}
            />
            <span>
              Text me pickup reminders (day before + day of). Msg &amp; data rates may apply. Reply STOP to opt out.
            </span>
          </div>

          {phoneError ? (
            <div style={{ fontSize: 13, color: "#b00020" }}>{phoneError}</div>
          ) : null}
        </label>
      </div>

      <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between" }}>
        <strong>Total</strong>
        <strong>${(totalCents / 100).toFixed(2)}</strong>
      </div>

      <button
        onClick={checkout}
        disabled={!cartItems.length || !isCustomerValid}
        style={{
          marginTop: "1.5rem",
          width: "100%",
          padding: "0.9rem",
          background: cartItems.length && isCustomerValid ? "black" : "#999",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontWeight: 700,
          cursor: cartItems.length && isCustomerValid ? "pointer" : "not-allowed",
        }}
      >
        Pre-Order & Pay
      </button>
        </>
      ) : null}
    </main>
  );
}
