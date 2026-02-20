"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginClient() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    // After sign-in, the server guard will allow /admin
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/admin";
    window.location.href = next;
  }

  return (
    <form onSubmit={signIn} style={{ display: "grid", gap: 12 }}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
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
            status === "loading" || !email.includes("@") || password.length < 6
              ? 0.6
              : 1,
        }}
      >
        {status === "loading" ? "Signing in..." : "Sign in"}
      </button>

      {message ? <p style={{ margin: 0, color: "#b00020" }}>{message}</p> : null}
    </form>
  );
}