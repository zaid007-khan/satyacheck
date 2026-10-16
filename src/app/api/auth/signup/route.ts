import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (name.length < 2 || name.length > 80)
      return NextResponse.json({ error: "Name must be 2–80 characters." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8 || password.length > 128)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length)
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hashPassword(password), role: "user" })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

    const token = await createSession(user.id);
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("signup", e);
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 });
  }
}
