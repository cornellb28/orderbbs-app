import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminOr401 } from "@/lib/admin-guard";

export const runtime = "nodejs";

type CreateEventBody = {
    title: string;
    pickup_date: string;         // YYYY-MM-DD
    pickup_start: string;        // HH:MM
    pickup_end: string;          // HH:MM
    location_name: string;
    location_address: string;
    deadline: string;            // ISO or "YYYY-MM-DDTHH:MM:SSZ"
};

function isCreateBody(v: unknown): v is CreateEventBody {
    if (!v || typeof v !== "object") return false;
    const b = v as Partial<CreateEventBody>;
    return (
        typeof b.title === "string" &&
        typeof b.pickup_date === "string" &&
        typeof b.pickup_start === "string" &&
        typeof b.pickup_end === "string" &&
        typeof b.location_name === "string" &&
        typeof b.location_address === "string" &&
        typeof b.deadline === "string"
    );
}

export async function GET() {
    const admin = await requireAdminOr401();
    if (!admin.ok) return admin.res;

    const supabase = createSupabaseServiceClient();

    const [{ data: events, error: eErr }, { data: stats, error: sErr }] =
        await Promise.all([
            supabase
                .from("events")
                .select(
                    "id,title,pickup_date,pickup_start,pickup_end,location_name,location_address,deadline,is_active,created_at"
                )
                .order("pickup_date", { ascending: false }),

            supabase
                .from("event_order_stats")
                .select(
                    "event_id,orders_total,orders_paid,orders_unpaid,revenue_total_cents,revenue_paid_cents"
                ),
        ]);

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    const statsByEvent = new Map(
        (stats ?? []).map((r) => [r.event_id, r])
    );

    const merged = (events ?? []).map((ev) => {
        const st = statsByEvent.get(ev.id);
        return {
            ...ev,
            stats: {
                orders_total: st?.orders_total ?? 0,
                orders_paid: st?.orders_paid ?? 0,
                orders_unpaid: st?.orders_unpaid ?? 0,
                revenue_total_cents: Number(st?.revenue_total_cents ?? 0),
                revenue_paid_cents: Number(st?.revenue_paid_cents ?? 0),
            },
        };
    });

    return NextResponse.json({ events: merged });
}

export async function POST(req: Request) {
    const admin = await requireAdminOr401();
    if (!admin.ok) return admin.res;

    const body: unknown = await req.json();
    if (!isCreateBody(body)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .from("events")
        .insert({
            title: body.title.trim(),
            pickup_date: body.pickup_date,
            pickup_start: body.pickup_start,
            pickup_end: body.pickup_end,
            location_name: body.location_name.trim(),
            location_address: body.location_address.trim(),
            deadline: body.deadline,
            is_active: false,
        })
        .select("id")
        .single<{ id: string }>();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
}