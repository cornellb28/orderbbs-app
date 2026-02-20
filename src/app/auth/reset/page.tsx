"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: "1.5rem" }}>
      <h1>Reset password</h1>

      {sent ? (
        <p>Check your email for a password reset link.</p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">Send reset link</button>

          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      )}
    </main>
  );
}