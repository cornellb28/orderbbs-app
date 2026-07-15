"use client";

import { useMemo, useState } from "react";
import type { EventWithMenu, Product } from "@/lib/types";
import type { NextDropEvent } from "@/lib/events-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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
    <main className="max-w-[720px] mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-2 tracking-tight">{event.title}</h1>

      <p className="mb-6 text-muted-foreground">
        Pickup: {event.pickup_date} · {event.pickup_start}–{event.pickup_end}
        <br />
        {event.location_name}
      </p>

      {!isOpen ? (
        <Alert className="mb-6">
          <AlertTitle>Ordering Closed</AlertTitle>
          <AlertDescription>
            {nextDrop ? (
              <>
                Ordering opens again for the next drop: {formatPickupDate(nextDrop.pickup_date)} ·{" "}
                {formatPickupTime(nextDrop.pickup_start)}–{formatPickupTime(nextDrop.pickup_end)} at{" "}
                {nextDrop.location_name}.
              </>
            ) : (
              "Next drop date will be posted soon."
            )}
            <br />
            Browsing the menu from the most recent drop below.
          </AlertDescription>
        </Alert>
      ) : null}

      <h2 className="text-xl font-semibold mb-3">Menu</h2>

      <ul className="list-none p-0 m-0">
        {event.menu.map((p: Product) => {
          const qty = qtyById[p.id] ?? 0;
          return (
            <li key={p.id} className="flex justify-between items-center py-3 border-b">
              <div>
                <div className="font-semibold">{p.name}</div>
                {p.description ? (
                  <div className="text-sm text-muted-foreground">{p.description}</div>
                ) : null}
                <div className="mt-1">${(p.price_cents / 100).toFixed(2)}</div>
              </div>

              {isOpen ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => dec(p.id)}>-</Button>
                  <span className="min-w-6 text-center">{qty}</span>
                  <Button variant="outline" size="icon-sm" onClick={() => inc(p.id)}>+</Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {isOpen ? (
        <>
          <h2 className="text-xl font-semibold mt-8 mb-3">Customer Info</h2>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="customer-name">Full Name</Label>
              <Input
                id="customer-name"
                type="text"
                placeholder="Full Name"
                value={customer.name}
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="Email"
                value={customer.email}
                onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="customer-phone">Phone (optional)</Label>
              <Input
                id="customer-phone"
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
            </div>

            <Label className="flex items-start gap-2.5 text-sm font-normal">
              <Checkbox
                checked={smsOptIn}
                disabled={!customer.phone.trim() || !isValidUSPhone(customer.phone)}
                onCheckedChange={(checked) => {
                  const next = checked === true;

                  if (next && !isValidUSPhone(customer.phone)) {
                    setPhoneError("Enter a valid US phone number (10 digits) to get SMS reminders.");
                    return;
                  }

                  setSmsOptIn(next);
                  setPhoneError(null);
                }}
                className="mt-0.5"
              />
              <span>
                Text me pickup reminders (day before + day of). Msg &amp; data rates may apply. Reply STOP to opt out.
              </span>
            </Label>

            {phoneError ? (
              <p className="text-sm text-destructive">{phoneError}</p>
            ) : null}
          </div>

          <Separator className="my-6" />

          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${(totalCents / 100).toFixed(2)}</span>
          </div>

          <Button
            onClick={checkout}
            disabled={!cartItems.length || !isCustomerValid}
            size="lg"
            className="w-full mt-4"
          >
            Pre-Order & Pay
          </Button>
        </>
      ) : null}
    </main>
  );
}
