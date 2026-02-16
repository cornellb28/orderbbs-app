import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubscribeBody = {
  name?: string | null;
  email: string;
  phone?: string | null;
  smsOptIn?: boolean;
};

function normalizePhoneToE164US(input: string): string | null {
  // Keep digits only
  const digits = input.replace(/\D/g, "");

  // Allow: 10 digits (US) or 11 digits starting with 1
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
}

function isSubscribeBody(v: unknown): v is SubscribeBody {
  if (!v || typeof v !== "object") return false;

  const b = v as {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    smsOptIn?: unknown;
  };

  if (typeof b.email !== "string" || !b.email.includes("@")) return false;
  if (b.name !== undefined && b.name !== null && typeof b.name !== "string") return false;
  if (b.phone !== undefined && b.phone !== null && typeof b.phone !== "string") return false;
  if (b.smsOptIn !== undefined && typeof b.smsOptIn !== "boolean") return false;

  // If they opted into SMS, require a phone number
  if (b.smsOptIn === true) {
    if (!b.phone || typeof b.phone !== "string") return false;
    const normalized = normalizePhoneToE164US(b.phone);
    if (!normalized) return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (!isSubscribeBody(body)) {
      return NextResponse.json({ error: "Invalid payload (check email/phone)" }, { status: 400 });
    }

    const name = (body.name ?? "").toString().trim();
    const email = body.email.toLowerCase().trim();

    const phoneRaw = (body.phone ?? "").toString().trim();
    const phoneNormalized = phoneRaw ? normalizePhoneToE164US(phoneRaw) : null;

    // If they typed a phone but it's invalid, reject (even if smsOptIn is false)
    // This keeps your DB clean.
    if (phoneRaw && !phoneNormalized) {
      return NextResponse.json(
        { error: "Phone number must be a valid US number (10 digits)." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Upsert by unique email (prevents duplicates)
    const { error } = await supabase
      .from("subscribers")
      .upsert(
        {
          name: name || null,
          email,
          phone: phoneNormalized,
          sms_opt_in: body.smsOptIn === true,
        },
        { onConflict: "email" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Subscribe failed" }, { status: 500 });
  }
}
