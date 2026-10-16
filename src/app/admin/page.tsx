import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminClient } from "@/components/AdminClient";

export const metadata = { title: "Admin — SatyaCheck" };

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard");
  return <AdminClient />;
}
