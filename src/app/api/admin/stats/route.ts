import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { scans, users, contentReports } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const [totals] = await db
    .select({
      totalScans: sql<number>`count(*)::int`,
      avgTrust: sql<number>`coalesce(round(avg(${scans.trustScore}))::int, 0)`,
      manipulated: sql<number>`count(*) filter (where ${scans.verdict} = 'manipulated')::int`,
    })
    .from(scans);
  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(users);
  const [{ openReports }] = await db
    .select({ openReports: sql<number>`count(*)::int` })
    .from(contentReports)
    .where(eq(contentReports.status, "open"));

  const byType = await db
    .select({ type: scans.type, count: sql<number>`count(*)::int` })
    .from(scans)
    .groupBy(scans.type);

  const verdicts = await db
    .select({ verdict: scans.verdict, count: sql<number>`count(*)::int` })
    .from(scans)
    .groupBy(scans.verdict);

  const byDay = await db
    .select({
      day: sql<string>`to_char(${scans.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(scans)
    .where(sql`${scans.createdAt} > now() - interval '14 days'`)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const recent = await db
    .select({
      id: scans.id,
      type: scans.type,
      target: scans.target,
      trustScore: scans.trustScore,
      verdict: scans.verdict,
      createdAt: scans.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(scans)
    .innerJoin(users, eq(scans.userId, users.id))
    .orderBy(desc(scans.createdAt))
    .limit(12);

  return NextResponse.json({ totals, totalUsers, openReports, byType, verdicts, byDay, recent });
}
