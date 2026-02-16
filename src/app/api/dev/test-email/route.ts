import { NextResponse } from "next/server";
import { getResend, getFromEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { to?: string };
    const to = body?.to;

    if (!to || typeof to !== "string") {
      return NextResponse.json({ error: "Missing 'to' email" }, { status: 400 });
    }

    const resend = getResend();
    const from = getFromEmail();

    await resend.emails.send({
      from,
      to,
      subject: "BBS Test Email ✅",
      html: `<p>This is a test email from your Bowl & Broth app.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
