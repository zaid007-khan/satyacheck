import { db } from "@/db";
import { scans, users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { LandingClient } from "@/components/LandingClient";

export const dynamic = "force-dynamic";

export type LandingStats = {
  totalScans: number;
  totalUsers: number;
  manipulated: number;
  avgTrust: number;
};

async function getStats(): Promise<LandingStats> {
  try {
    const [s] = await db
      .select({
        totalScans: sql<number>`count(*)::int`,
        avgTrust: sql<number>`coalesce(round(avg(${scans.trustScore}))::int, 0)`,
        manipulated: sql<number>`count(*) filter (where ${scans.verdict} = 'manipulated')::int`,
      })
      .from(scans);
    const [u] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(users);
    return { totalScans: s?.totalScans ?? 0, totalUsers: u?.totalUsers ?? 0, manipulated: s?.manipulated ?? 0, avgTrust: s?.avgTrust ?? 0 };
  } catch {
    return { totalScans: 0, totalUsers: 0, manipulated: 0, avgTrust: 0 };
  }
}

export default async function LandingPage() {
  const stats = await getStats();
  return <LandingClient stats={stats} />;
}
