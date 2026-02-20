"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const next = searchParams.get("next") || "/admin";
  const notAdmin = searchParams.get("error") === "admin_query_failed";

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    // After sign-in, middleware will check allowlist.
    // Refresh first so the session cookie is definitely visible to the app,
    // then navigate to next.
    router.refresh();
    router.replace(next);
  }

  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const err = params.get("error");

  const banner =
    err === "not_admin"
      ? "This account is signed in, but it isn’t on the admin allowlist yet."
      : err === "admin_query_failed"
        ? "Signed in, but the server could not verify admin access (RLS/policy issue)."
        : err === "not_logged_in"
          ? "Please sign in to continue."
          : "";

  return (
    <>
      {banner ? (
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 12 }}>
          {banner}
        </div>
      ) : null}
      <form onSubmit={signIn} style={{ display: "grid", gap: 12 }}>
        {notAdmin ? (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #f3c2c2",
              background: "#fff5f5",
              color: "#7a0b0b",
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            This account is signed in, but it isn’t on the admin allowlist yet.
            <br />
            Add your user to <code>admin_users</code> (user_id from <code>auth.users</code>).
          </div>
        ) : null}

        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={status === "loading" || !email.includes("@") || password.length < 6}
          style={{
            padding: "0.9rem 1.2rem",
            background: "black",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
            opacity:
              status === "loading" || !email.includes("@") || password.length < 6 ? 0.6 : 1,
          }}
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>

        {message ? <p style={{ margin: 0, color: "#b00020" }}>{message}</p> : null}

        <p style={{ margin: 0, opacity: 0.7, fontSize: 13 }}>
          You’ll be redirected to: <code>{next}</code>
        </p>
      </form>
    </>
  );
}