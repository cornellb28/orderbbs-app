import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrderSummary } from "@/lib/orders";
import { getResend, getFromEmail } from "@/lib/email";
import { orderConfirmationHtml } from "@/lib/email-templates";
import Stripe from "stripe";

export const runtime = "nodejs";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const orderId = session.metadata?.orderId;
      if (!orderId) {
        console.error("Missing orderId in session metadata", {
          sessionId: session.id,
          metadata: session.metadata,
        });
        return NextResponse.json({ received: true });
      }

      const supabase = createSupabaseServerClient();

      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      // 1) Mark order as paid/confirmed
      const { error: updErr } = await supabase
        .from("orders")
        .update({
          paid: true,
          status: "confirmed",
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("id", orderId);

      if (updErr) {
        console.error("Failed to update order paid:", updErr.message, {
          orderId,
          sessionId: session.id,
        });
        // Still return 200 so Stripe doesn't retry forever; you can fix manually.
        return NextResponse.json({ received: true });
      }

      console.log("✅ Order marked as paid", {
        orderId,
        sessionId: session.id,
        paymentIntentId,
        email: session.customer_email,
      });

      // 2) Idempotency: only send confirmation email once
      const { data: orderRow, error: orderFetchErr } = await supabase
        .from("orders")
        .select("id, email, confirmation_email_sent_at")
        .eq("id", orderId)
        .maybeSingle<{ id: string; email: string; confirmation_email_sent_at: string | null }>();

      if (orderFetchErr || !orderRow) {
        console.warn("Could not load order for email check", {
          orderId,
          err: orderFetchErr?.message,
        });
        return NextResponse.json({ received: true });
      }

      if (orderRow.confirmation_email_sent_at) {
        console.log("ℹ️ Confirmation email already sent, skipping", { orderId });
        return NextResponse.json({ received: true });
      }

      // 3) Send email + stamp confirmation_email_sent_at
      try {
        const order = await getOrderSummary(orderId);

        if (!order) {
          console.warn("Order summary not found for email", { orderId });
          return NextResponse.json({ received: true });
        }

        const resend = getResend();
        const from = getFromEmail();

        await resend.emails.send({
          from,
          to: order.email,
          subject: "Your Bowl & Broth order is confirmed ✅",
          html: orderConfirmationHtml(order),
        });

        await supabase
          .from("orders")
          .update({ confirmation_email_sent_at: new Date().toISOString() })
          .eq("id", orderId);

        console.log("✅ Confirmation email sent", { orderId, to: order.email });
      } catch (e: unknown) {
        console.error("Email send failed:", getErrorMessage(e), { orderId });
        // Don't throw — avoid Stripe retries spamming
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("Webhook handler error:", getErrorMessage(err));
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
