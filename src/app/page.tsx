import Link from "next/link";
import { getActiveEventWithMenu } from "@/lib/events";
import { getNextDropEvent } from "@/lib/events-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NotifyForm from "./notify-form";
import Footer from "./components/footer";

function formatPickupDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatPickupTime(timeStr: string) {
  const [hh = "00", mm = "00"] = timeStr.split(":");
  const d = new Date(
    `2000-01-01T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`
  );
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatDeadline(deadlineIso: string) {
  const d = new Date(deadlineIso);
  if (Number.isNaN(d.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function isDeadlinePassed(deadlineIso: string) {
  const ms = Date.parse(deadlineIso);
  return Number.isNaN(ms) ? false : Date.now() > ms;
}

export default async function HomePage() {
  const active = await getActiveEventWithMenu();
  const nextDrop = active ? null : await getNextDropEvent();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;

  if (user) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    isAdmin = !!adminRow;
  }

  const deadlineText = active?.deadline ? formatDeadline(active.deadline) : null;
  const deadlinePassed = active?.deadline ? isDeadlinePassed(active.deadline) : false;

  return (
    <>
      <main className="max-w-[720px] mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          Bowl & Broth Society
        </h1>
        <p className="text-lg mb-6 leading-relaxed text-muted-foreground">
          Japanese comfort food made in small batches.
          <br />
          Weekly pre-orders. Limited quantities.
        </p>

        {active ? (
          <>
            <Card className="mb-5">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Current Drop</CardTitle>
                  <Badge variant={deadlinePassed ? "destructive" : "secondary"}>
                    {deadlinePassed ? "Ordering Closed" : "Ordering Open"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed opacity-90">
                <div>
                  <strong>Pickup:</strong> {formatPickupDate(active.pickup_date)} ·{" "}
                  {formatPickupTime(active.pickup_start)}–
                  {formatPickupTime(active.pickup_end)}
                </div>

                <div>
                  <strong>Location:</strong> {active.location_name}
                </div>

                <div className="opacity-75">{active.location_address}</div>

                {deadlineText ? (
                  <div className="mt-2.5">
                    <strong>Order cutoff:</strong> {deadlineText} CT
                  </div>
                ) : null}

                <div className="text-xs opacity-75 mt-1.5">
                  Pre-orders close at the cutoff time (or earlier if we sell out).
                </div>
              </CardContent>
            </Card>

            {!deadlinePassed ? (
              <Button render={<Link href="/preorder" />} size="lg">
                Pre-Order for This Week →
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Ordering Closed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="opacity-85 leading-relaxed">
                    Ordering is closed for this drop. Join the list below for the next one.
                  </p>
                  <NotifyForm />
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Preorders Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="opacity-85 leading-relaxed">
                Join the list and we’ll email you when the next drop opens.
              </p>

              {nextDrop ? (
                <Card className="mt-4 bg-muted/40">
                  <CardContent className="pt-4">
                    <div className="font-semibold mb-1">Next Drop</div>
                    <div className="text-sm leading-relaxed opacity-90">
                      <div>
                        <strong>Pickup:</strong>{" "}
                        {formatPickupDate(nextDrop.pickup_date)} ·{" "}
                        {formatPickupTime(nextDrop.pickup_start)}–
                        {formatPickupTime(nextDrop.pickup_end)}
                      </div>
                      <div>
                        <strong>Location:</strong> {nextDrop.location_name}
                      </div>
                      <div className="opacity-75">{nextDrop.location_address}</div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="mt-4 opacity-75">
                  Next drop date will be posted soon.
                </div>
              )}

              <NotifyForm />
            </CardContent>
          </Card>
        )}

        <div className="mt-12 text-sm text-muted-foreground">
          <p>Pickup only · No walk-ups guaranteed</p>
        </div>
      </main>
      <Footer isAdmin={isAdmin} />
    </>
  );
}
