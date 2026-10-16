import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { analyzeText } from "@/lib/detect/text";
import { hfTextFakeNews, hfEnabled } from "@/lib/hf";
import { blend, confidenceFor, verdictFor } from "@/lib/detect/scoring";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const started = Date.now();
  try {
    const body = await req.json();
    const text = String(body.text ?? "").trim();
    if (text.length < 12)
      return NextResponse.json({ error: "Paste at least a full sentence (12+ characters) to analyse." }, { status: 400 });
    if (text.length > 8000)
      return NextResponse.json({ error: "Text is too long — keep it under 8,000 characters." }, { status: 413 });

    const local = analyzeText(text);

    let modelP: number | null = null;
    if (hfEnabled()) {
      const hf = await hfTextFakeNews(text);
      if (hf) modelP = hf.pFake;
    }
    const pFake = modelP == null ? local.pFake : blend(modelP, 0.42, local.pFake, 0.58);
    const agreement = modelP == null ? 0.5 : 1 - Math.abs(modelP - local.pFake);
    const trustScore = Math.round((1 - pFake) * 100);
    const durationMs = Date.now() - started;
    const confidence = confidenceFor(pFake, modelP != null, agreement);

    const flags = [...local.flags];
    flags.push(
      modelP != null
        ? { label: "Neural model corroborated", detail: `Fake-news transformer scored ${(modelP * 100).toFixed(0)}% misinformation-probability.`, severity: "info" }
        : { label: "Heuristic-forensics mode", detail: "Stylometric + URL-reputation ensemble. Add HF_TOKEN to blend the fake-news transformer.", severity: "info" }
    );

    const signals: Record<string, string | number | boolean> = {
      ...(local.signals as unknown as Record<string, string | number | boolean>),
      urls: local.signals.urls.join(", "),
      neuralModel: modelP != null ? +modelP.toFixed(3) : "offline",
    };
    const target = text.slice(0, 140);
    const [row] = await db
      .insert(scans)
      .values({ userId: user.id, type: "text", target, trustScore, verdict: verdictFor(trustScore), confidence, flags, signals, durationMs })
      .returning({ id: scans.id, createdAt: scans.createdAt });

    return NextResponse.json({ id: row.id, type: "text", target, trustScore, verdict: verdictFor(trustScore), confidence, flags, signals, durationMs, createdAt: row.createdAt });
  } catch (e) {
    console.error("scan/text", e);
    return NextResponse.json({ error: "Text analysis failed unexpectedly. Please try again." }, { status: 500 });
  }
}
