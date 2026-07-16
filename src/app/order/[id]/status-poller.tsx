"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type Props = {
  orderId: string;
  token: string;
  initialPaid: boolean;
};

// Optimistic "confirming" state for the confirmation page. The webhook is
// the only source of truth for "paid" — this just polls a token-gated read
// of that same state until it flips, then refreshes the server-rendered
// page. Polling rather than Supabase Realtime on purpose: orders/order_items
// intentionally have zero anon/authenticated RLS policies (service-role
// only), so a Realtime subscription from the browser would either be denied
// or require reopening that lockdown.
export default function OrderStatusPoller({ orderId, token, initialPaid }: Props) {
  const router = useRouter();
  const [paid, setPaid] = useState(initialPaid);

  useEffect(() => {
    if (paid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/order-status?id=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token)}`
        );
        if (!res.ok) return;

        const data: { paid?: boolean } = await res.json();
        if (data.paid) {
          setPaid(true);
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // transient network error — next tick retries
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orderId, token, paid, router]);

  if (paid) return null;

  return (
    <Alert className="mb-6">
      <AlertTitle>Payment received, confirming…</AlertTitle>
      <AlertDescription>
        This updates automatically once your order is confirmed — no need to refresh.
      </AlertDescription>
    </Alert>
  );
}
