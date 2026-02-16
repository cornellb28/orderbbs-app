import { Resend } from "resend";

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  return new Resend(key);
}

export function getFromEmail() {
  const from = process.env.FROM_EMAIL;
  if (!from) throw new Error("Missing FROM_EMAIL");
  return from;
}
