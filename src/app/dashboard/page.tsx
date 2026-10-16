import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";

export const metadata = { title: "Verify Content — SatyaCheck" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  return <Dashboard />;
}
