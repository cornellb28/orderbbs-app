import Link from "next/link";
import { getActiveEventWithMenu } from "@/lib/events";
import { getNextDropEvent } from "@/lib/events-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
    <main className="container" style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
        Bowl & Broth Society
      </h1>
      <p style={{ opacity: 0.6 }}>DEPLOY TEST: 2026-02-18</p>
      <p
        style={{
          fontSize: "1.1rem",
          marginBottom: "1.5rem",
          lineHeight: 1.6,
        }}
      >
        Japanese comfort food made in small batches.
        <br />
        Weekly pre-orders. Limited quantities.
      </p>

      {active ? (
        <>
          <div
            style={{
              padding: "1rem 1.25rem",
              border: "1px solid #eee",
              borderRadius: 10,
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 700 }}>Current Drop</div>

              <div
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #eee",
                  background: deadlinePassed ? "#fff5f5" : "#f6ffed",
                }}
              >
                {deadlinePassed ? "Ordering Closed" : "Ordering Open"}
              </div>
            </div>

            <div style={{ marginTop: 10, opacity: 0.88, lineHeight: 1.65 }}>
              <div>
                <strong>Pickup:</strong> {formatPickupDate(active.pickup_date)} ·{" "}
                {formatPickupTime(active.pickup_start)}–
                {formatPickupTime(active.pickup_end)}
              </div>

              <div>
                <strong>Location:</strong> <a href="">{active.location_name}</a>
              </div>

              <div style={{ opacity: 0.75 }}>{active.location_address}</div>

              {deadlineText ? (
                <div style={{ marginTop: 10 }}>
                  <strong>Order cutoff:</strong> {deadlineText} CT
                </div>
              ) : null}

              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
                Pre-orders close at the cutoff time (or earlier if we sell out).
              </div>
            </div>
          </div>

          {!deadlinePassed ? (
            <Link
              href="/preorder"
              style={{
                display: "inline-block",
                padding: "0.9rem 1.6rem",
                background: "black",
                color: "white",
                textDecoration: "none",
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Pre-Order for This Week →
            </Link>
          ) : (
            <div
              style={{
                padding: "1rem 1.25rem",
                border: "1px solid #eee",
                borderRadius: 10,
                opacity: 0.95,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Ordering Closed
              </div>
              <div style={{ opacity: 0.85, lineHeight: 1.6 }}>
                Ordering is closed for this drop. Join the list below for the next one.
              </div>

              <div style={{ marginTop: "1rem" }}>
                <NotifyForm />
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            padding: "1rem 1.25rem",
            border: "1px solid #eee",
            borderRadius: 10,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Preorders Closed
          </div>
          <div style={{ opacity: 0.85, lineHeight: 1.6 }}>
            Join the list and we’ll email you when the next drop opens.
          </div>

          {nextDrop ? (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.9rem 1rem",
                background: "#fafafa",
                border: "1px solid #eee",
                borderRadius: 10,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Next Drop</div>
              <div style={{ opacity: 0.9, lineHeight: 1.6 }}>
                <div>
                  <strong>Pickup:</strong>{" "}
                  {formatPickupDate(nextDrop.pickup_date)} ·{" "}
                  {formatPickupTime(nextDrop.pickup_start)}–
                  {formatPickupTime(nextDrop.pickup_end)}
                </div>
                <div>
                  <strong>Location:</strong> {nextDrop.location_name}
                </div>
                <div style={{ opacity: 0.75 }}>{nextDrop.location_address}</div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "1rem", opacity: 0.75 }}>
              Next drop date will be posted soon.
            </div>
          )}

          <NotifyForm />
        </div>
      )}

      <div style={{ marginTop: "3rem", opacity: 0.7 }}>
        <p>Pickup only · No walk-ups guaranteed</p>
      </div>
    </main>
    <Footer isAdmin={isAdmin} />
    </>
  );
}
