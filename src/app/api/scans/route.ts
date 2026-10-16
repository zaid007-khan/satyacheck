import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const where = type && ["image", "video", "audio", "text"].includes(type)
    ? and(eq(scans.userId, user.id), eq(scans.type, type))
    : eq(scans.userId, user.id);

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
    })
    .from(scans)
    .where(where)
    .orderBy(desc(scans.createdAt))
    .limit(100);

  return NextResponse.json({ scans: rows });
}
