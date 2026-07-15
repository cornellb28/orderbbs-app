"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={submit} className="grid gap-3 mt-4">
      <Input
        type="text"
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Input
        type="email"
        placeholder="Email (required)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Input
        type="tel"
        placeholder="Phone (optional, US)"
        value={phone}
        onChange={(e) => {
          const val = e.target.value;
          setPhone(val);
          if (!val.trim()) setSmsOptIn(false);
        }}
      />

      <Label className={`flex items-start gap-2.5 text-sm font-normal ${phone ? "opacity-90" : "opacity-50"}`}>
        <Checkbox
          checked={smsOptIn}
          disabled={!phone.trim()}
          onCheckedChange={(checked) => setSmsOptIn(checked === true)}
          className="mt-0.5"
        />
        <span>
          Text me when preorders open. Msg &amp; data rates may apply. Reply STOP
          to opt out.
        </span>
      </Label>

      <Button type="submit" disabled={!canSubmit} size="lg">
        {status === "loading" ? "Joining..." : "Notify me for the next drop"}
      </Button>

      {message ? (
        <p className={`m-0 text-sm ${status === "error" ? "text-destructive" : "opacity-80"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
