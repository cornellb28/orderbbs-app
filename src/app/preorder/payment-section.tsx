"use client";

import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripeClient } from "@/lib/stripe-client";
import { Button } from "@/components/ui/button";

type Props = {
  clientSecret: string;
  returnUrl: string;
};

function PayForm({ returnUrl }: { returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    // Only reached for immediate failures (declined card, validation, etc.)
    // — redirect-based methods like Cash App Pay navigate away and never
    // return here on success, landing on returnUrl instead.
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <PaymentElement />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={!stripe || submitting} className="w-full">
        {submitting ? "Processing…" : "Pay Now"}
      </Button>
    </form>
  );
}

export default function PaymentSection({ clientSecret, returnUrl }: Props) {
  return (
    <Elements stripe={getStripeClient()} options={{ clientSecret }}>
      <PayForm returnUrl={returnUrl} />
    </Elements>
  );
}
