import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrderSummary } from "@/lib/orders";
import { getResend, getFromEmail } from "@/lib/email";
import { orderConfirmationHtml } from "@/lib/email-templates";
import { sendSms } from "@/lib/sms";
import Stripe from "stripe";

export const runtime = "nodejs";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// Sends the order-confirmation email + (opt-in) SMS exactly once, guarded by
// confirmation_email_sent_at. Called only after the order is confirmed paid.
// Receipt failures are logged, never thrown — a broken email/SMS provider
// must not cause Stripe to retry the webhook or otherwise affect payment
// confirmation, which has already been recorded by this point.
async function sendReceiptsOnce(orderId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { data: orderRow, error: orderFetchErr } = await supabase
    .from("orders")
    .select("id, confirmation_email_sent_at")
    .eq("id", orderId)
    .maybeSingle<{ id: string; confirmation_email_sent_at: string | null }>();

  if (orderFetchErr || !orderRow) {
    console.warn("Could not load order for receipt check", { orderId, err: orderFetchErr?.message });
    return;
  }

  if (orderRow.confirmation_email_sent_at) {
    console.log("ℹ️ Receipts already sent, skipping", { orderId });
    return;
  }

  const order = await getOrderSummary(orderId);
  if (!order) {
    console.warn("Order summary not found for receipts", { orderId });
    return;
  }

  try {
    const resend = getResend();
    const from = getFromEmail();

    await resend.emails.send({
      from,
      to: order.email,
      subject: "Your Bowl & Broth order is confirmed ✅",
      html: orderConfirmationHtml(order),
    });

    console.log("✅ Confirmation email sent", { orderId, to: order.email });
  } catch (e: unknown) {
    console.error("Email receipt failed:", getErrorMessage(e), { orderId });
  }

  try {
    if (order.phone && order.sms_opt_in) {
      const total = (order.total_cents / 100).toFixed(2);
      const msg = `Bowl & Broth Society: Your order is confirmed! Total $${total}. Pickup ${order.event.pickup_date} ${order.event.pickup_start}-${order.event.pickup_end} at ${order.event.location_name}. Thanks!`;
      await sendSms(order.phone, msg);
      console.log("✅ Confirmation SMS sent", { orderId, to: order.phone });
    }
  } catch (e: unknown) {
    console.error("SMS receipt failed:", getErrorMessage(e), { orderId });
  }

  // Stamp once both receipt attempts are done (regardless of their individual
  // success), so a retried webhook delivery doesn't resend either.
  await supabase
    .from("orders")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("id", orderId);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // MUST be raw text for signature verification
    const rawBody = await req.text();
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", getErrorMessage(err));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.supabase_order_id;

      if (!orderId) {
        console.error("Missing supabase_order_id in PaymentIntent metadata", {
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
        });
        return NextResponse.json({ received: true });
      }

      const supabase = createSupabaseAdminClient();

      // The webhook is the only source of truth for "paid" — this is what
      // actually confirms the order, independent of whatever the client saw
      // from stripe.confirmPayment().
      const { error: updErr } = await supabase
        .from("orders")
        .update({
          paid: true,
          status: "confirmed",
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq("id", orderId);

      if (updErr) {
        console.error("Failed to update order paid:", updErr.message, {
          orderId,
          paymentIntentId: paymentIntent.id,
        });
        // Still return 200 so Stripe doesn't retry forever; fix manually.
        return NextResponse.json({ received: true });
      }

      console.log("✅ Order marked as paid", {
        orderId,
        paymentIntentId: paymentIntent.id,
      });

      await sendReceiptsOnce(orderId);
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.supabase_order_id;

      // No status change here on purpose: the Payment Element lets the
      // customer retry a failed attempt on the same PaymentIntent, so one
      // failure doesn't mean the order is actually dead. This is logged for
      // now per the task's admin "Failed Payment" notification requirement —
      // wiring an actual admin alert (email/SMS) is a follow-up decision, not
      // implemented here.
      console.error("Payment failed", {
        orderId,
        paymentIntentId: paymentIntent.id,
        error: paymentIntent.last_payment_error?.message,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("Webhook handler error:", getErrorMessage(err));
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
