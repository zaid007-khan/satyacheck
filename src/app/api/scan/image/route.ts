import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { analyzeImage } from "@/lib/detect/image";
import { hfImageDeepfake, hfEnabled } from "@/lib/hf";
import { blend, confidenceFor, verdictFor } from "@/lib/detect/scoring";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const started = Date.now();
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });

    const mime = file.type.toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(mime))
      return NextResponse.json({ error: `Unsupported format “${mime || "unknown"}”. Use JPEG, PNG, WebP, AVIF or GIF.` }, { status: 415 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Image exceeds the 10 MB limit." }, { status: 413 });
    if (file.size < 512)
      return NextResponse.json({ error: "File is too small to analyse — it may be corrupt." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    let local;
    try {
      local = await analyzeImage(buffer);
    } catch {
      return NextResponse.json({ error: "Could not decode this image — it appears damaged or is not a real image file." }, { status: 422 });
    }

    // Neural model blend (when HF_TOKEN configured)
    let modelP: number | null = null;
    if (hfEnabled()) {
      const hf = await hfImageDeepfake(buffer, mime);
      if (hf) modelP = hf.pFake;
    }
    const pFake = modelP == null ? local.pFake : blend(modelP, 0.62, local.pFake, 0.38);
    const agreement = modelP == null ? 0.5 : 1 - Math.abs(modelP - local.pFake);
    const trustScore = Math.round((1 - pFake) * 100);
    const durationMs = Date.now() - started;

    const flags = [...local.flags];
    flags.push(
      modelP != null
        ? { label: "Neural model corroborated", detail: `Xception-Net deepfake classifier scored ${(modelP * 100).toFixed(0)}% fake-probability; blended with signal forensics.`, severity: "info" }
        : { label: "Signal-forensics mode", detail: "Multi-signal forensic ensemble (spectral, noise, compression, provenance). Add HF_TOKEN to blend the neural classifier.", severity: "info" }
    );

    const signals = { ...local.signals, neuralModel: modelP != null ? +modelP.toFixed(3) : "offline" };
    const [row] = await db
      .insert(scans)
      .values({
        userId: user.id,
        type: "image",
        target: file.name || "image",
        trustScore,
        verdict: verdictFor(trustScore),
        confidence: confidenceFor(pFake, modelP != null, agreement),
        flags,
        signals,
        durationMs,
      })
      .returning({ id: scans.id, createdAt: scans.createdAt });

    return NextResponse.json({
      id: row.id,
      type: "image",
      target: file.name,
      trustScore,
      verdict: verdictFor(trustScore),
      confidence: confidenceFor(pFake, modelP != null, agreement),
      flags,
      signals,
      durationMs,
      createdAt: row.createdAt,
    });
  } catch (e) {
    console.error("scan/image", e);
    return NextResponse.json({ error: "Analysis failed unexpectedly. Please try again." }, { status: 500 });
  }
}
