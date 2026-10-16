import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { scans, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { buildScanReportPdf } from "@/lib/pdf";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await ctx.params;
  const rows = await db
    .select({
      id: scans.id,
      type: scans.type,
      target: scans.target,
      trustScore: scans.trustScore,
      verdict: scans.verdict,
      confidence: scans.confidence,
      flags: scans.flags,
      signals: scans.signals,
      durationMs: scans.durationMs,
      createdAt: scans.createdAt,
      userName: users.name,
      userEmail: users.email,
      ownerId: scans.userId,
    })
    .from(scans)
    .innerJoin(users, eq(scans.userId, users.id))
    .where(and(eq(scans.id, id), user.role === "admin" ? undefined : eq(scans.userId, user.id)))
    .limit(1);

  const scan = rows[0];
  if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });

  const pdf = await buildScanReportPdf(scan);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="satyacheck-report-${scan.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
