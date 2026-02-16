import { NextResponse } from "next/server";

async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    throw new Error("Missing Twilio env vars");
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
      }),
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Twilio failed: ${text}`);
  }

  // Twilio returns JSON
  const json = JSON.parse(text) as { sid?: string; status?: string; to?: string; from?: string };
  return json;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { to?: string; message?: string };
    const to = body?.to;
    const message = body?.message ?? "BBS Test SMS ✅";

    if (!to || typeof to !== "string") {
      return NextResponse.json({ error: "Missing 'to' phone number" }, { status: 400 });
    }

    const result = await sendSms(to, message);

    return NextResponse.json({
      ok: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
