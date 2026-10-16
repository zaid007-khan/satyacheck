import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { contentReports, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

async function requireAdmin() {
  const user = await getSessionUser();
  return user && user.role === "admin" ? user : null;
}

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const rows = await db
    .select({
      id: contentReports.id,
      reason: contentReports.reason,
      notes: contentReports.notes,
      contentSummary: contentReports.contentSummary,
      status: contentReports.status,
      scanType: contentReports.scanType,
      createdAt: contentReports.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(contentReports)
    .innerJoin(users, eq(contentReports.userId, users.id))
    .orderBy(desc(contentReports.createdAt))
    .limit(100);
  return NextResponse.json({ reports: rows });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await req.json();
  const id = String(body.id ?? "");
  const status = body.status === "resolved" ? "resolved" : "open";
  if (!id) return NextResponse.json({ error: "Missing report id." }, { status: 400 });
  await db.update(contentReports).set({ status }).where(eq(contentReports.id, id));
  return NextResponse.json({ ok: true, status });
}
