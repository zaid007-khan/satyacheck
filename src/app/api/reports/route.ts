import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { contentReports } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

const REASONS = new Set([
  "deepfake_person",
  "voice_clone",
  "misinformation",
  "impersonation",
  "financial_scam",
  "communal_hate",
  "election_manipulation",
  "other",
]);

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await req.json();
    const reason = String(body.reason ?? "");
    if (!REASONS.has(reason))
      return NextResponse.json({ error: "Choose a valid report reason." }, { status: 400 });
    const notes = String(body.notes ?? "").slice(0, 1000);
    const contentSummary = String(body.contentSummary ?? "").slice(0, 300);
    const scanType = ["image", "video", "audio", "text"].includes(body.scanType) ? body.scanType : "image";
    const scanId = typeof body.scanId === "string" && body.scanId.length > 8 ? body.scanId : null;

    const [row] = await db
      .insert(contentReports)
      .values({ userId: user.id, scanId, scanType, reason, notes, contentSummary })
      .returning({ id: contentReports.id, createdAt: contentReports.createdAt });
    return NextResponse.json({ report: row });
  } catch (e) {
    console.error("reports POST", e);
    return NextResponse.json({ error: "Could not file the report. Try again." }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const rows = await db
    .select()
    .from(contentReports)
    .where(eq(contentReports.userId, user.id))
    .orderBy(desc(contentReports.createdAt))
    .limit(50);
  return NextResponse.json({ reports: rows });
}
