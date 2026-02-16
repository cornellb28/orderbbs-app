import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // If TS complains, remove this line
  // apiVersion: "2025-01-27.acacia",
});
