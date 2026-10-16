import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { HistoryClient } from "@/components/HistoryClient";

export const metadata = { title: "My Scans — SatyaCheck" };

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/history");
  return <HistoryClient />;
}
