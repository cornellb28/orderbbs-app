import AdminLoginClient from "./ui";

export default function AdminLoginPage() {
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Admin Login</h1>
      <p style={{ opacity: 0.75, marginBottom: 18 }}>
        Sign in to manage events and orders.
      </p>
      <AdminLoginClient />
    </main>
  );
}