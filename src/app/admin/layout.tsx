import AdminHeader from "../components/admin/admin-header";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: adminUser, error } = await supabase
    .from("admin_users")
    .select("user_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  // Not an active admin (or query failed) -> block
  if (error || !adminUser) redirect("/");

  return (
    <>
      <AdminHeader />
      <main>{children}</main>
    </>
  );
}