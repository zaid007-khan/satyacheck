import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { analyzeImage } from "@/lib/detect/image";
import { hfImageDeepfake, hfEnabled } from "@/lib/hf";
import { blend, clamp, confidenceFor, verdictFor } from "@/lib/detect/scoring";
import type { ScanFlag } from "@/db/schema";

const MAX_FRAMES = 12;
const MIN_FRAMES = 3;

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return Buffer.from(m[2], "base64");
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const started = Date.now();
  try {
    const body = await req.json();
    const framesRaw: unknown = body.frames;
    const fileName = String(body.fileName ?? "video").slice(0, 160);
    const durationSec = Number(body.durationSec ?? 0) || 0;

    if (!Array.isArray(framesRaw) || framesRaw.length < MIN_FRAMES)
      return NextResponse.json({ error: `Need at least ${MIN_FRAMES} sampled frames for temporal analysis.` }, { status: 400 });
    const frames = framesRaw.slice(0, MAX_FRAMES);

    const perFrame: number[] = [];
    const signalsAcc: Record<string, number[]> = { spectralPeakiness: [], jpegGridRatio: [], noiseUniformityCV: [], colorfulness: [] };
    const labelCounts = new Map<string, { count: number; maxSev: string; detail: string }>();
    let aiMetaHits = 0;

    for (const f of frames) {
      const buf = typeof f === "string" ? dataUrlToBuffer(f) : null;
      if (!buf) return NextResponse.json({ error: "A sampled frame could not be read." }, { status: 400 });
      if (buf.length > 3.5 * 1024 * 1024) return NextResponse.json({ error: "Frame payload too large." }, { status: 413 });
      let r;
      try {
        r = await analyzeImage(buf);
      } catch {
        return NextResponse.json({ error: "A video frame could not be decoded — the video may be corrupt." }, { status: 422 });
      }
      perFrame.push(r.pFake);
      signalsAcc.spectralPeakiness.push(r.signals.spectralPeakiness);
      signalsAcc.jpegGridRatio.push(r.signals.jpegGridRatio);
      signalsAcc.noiseUniformityCV.push(r.signals.noiseUniformityCV);
      signalsAcc.colorfulness.push(r.signals.colorfulness);
      if (r.signals.aiMetadataHit) aiMetaHits++;
      for (const fl of r.flags) {
        const cur = labelCounts.get(fl.label);
        if (cur) cur.count++;
        else labelCounts.set(fl.label, { count: 1, maxSev: fl.severity, detail: fl.detail });
      }
    }

    // Temporal coherence: deepfakes flicker — frame-level forensic variance rises.
    const mean = perFrame.reduce((s, v) => s + v, 0) / perFrame.length;
    const max = Math.max(...perFrame);
    const variance = perFrame.reduce((s, v) => s + (v - mean) * (v - mean), 0) / perFrame.length;
    const temporalInstability = Math.sqrt(variance);

    let pLocal = clamp(0.58 * mean + 0.3 * max + clamp((temporalInstability - 0.07) * 1.4, -0.06, 0.18), 0, 1);
    // Optional neural model on median frame
    let modelP: number | null = null;
    if (hfEnabled()) {
      const midIdx = Math.floor(perFrame.length / 2);
      const midBuf = dataUrlToBuffer(String(frames[midIdx]));
      if (midBuf) {
        const hf = await hfImageDeepfake(midBuf, "image/jpeg");
        if (hf) modelP = hf.pFake;
      }
    }
    const pFake = modelP == null ? pLocal : blend(modelP, 0.55, pLocal, 0.45);
    const agreement = modelP == null ? 0.5 : 1 - Math.abs(modelP - pLocal);
    const trustScore = Math.round((1 - pFake) * 100);
    const durationMs = Date.now() - started;

    const sevRank: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3 };
    const flags: ScanFlag[] = [...labelCounts.entries()]
      .map(([label, v]) => ({ label: `${label} (${v.count}/${perFrame.length} frames)`, detail: v.detail, severity: v.maxSev as ScanFlag["severity"] }))
      .sort((a, b) => sevRank[b.severity] - sevRank[a.severity])
      .slice(0, 8);
    if (temporalInstability > 0.12)
      flags.unshift({ label: "Temporal face-signal flicker", detail: `Frame-to-frame forensic drift (σ=${temporalInstability.toFixed(3)}) exceeds natural video coherence.`, severity: "high" });
    flags.push(
      modelP != null
        ? { label: "Neural model corroborated", detail: `Xception-Net scored median frame ${(modelP * 100).toFixed(0)}% fake-probability.`, severity: "info" }
        : { label: "Signal-forensics mode", detail: `${perFrame.length} frames sampled across ${durationSec ? durationSec.toFixed(1) + "s" : "the clip"}; multi-signal ensemble applied per frame.`, severity: "info" }
    );
    if (aiMetaHits > 0)
      flags.unshift({ label: "Generator metadata in frames", detail: `${aiMetaHits} frame(s) carry AI-generator fingerprints.`, severity: "high" });

    const avg = (a: number[]) => +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(3);
    const signals = {
      framesAnalysed: perFrame.length,
      durationSec: +durationSec.toFixed(1),
      frameFakeMean: +mean.toFixed(3),
      frameFakeMax: +max.toFixed(3),
      temporalInstability: +temporalInstability.toFixed(3),
      avgSpectralPeakiness: avg(signalsAcc.spectralPeakiness),
      avgJpegGrid: avg(signalsAcc.jpegGridRatio),
      avgNoiseCV: avg(signalsAcc.noiseUniformityCV),
      avgColorfulness: avg(signalsAcc.colorfulness),
      neuralModel: modelP != null ? +modelP.toFixed(3) : "offline",
    };
    const confidence = confidenceFor(pFake, modelP != null, agreement);

    const [row] = await db
      .insert(scans)
      .values({ userId: user.id, type: "video", target: fileName, trustScore, verdict: verdictFor(trustScore), confidence, flags, signals, durationMs })
      .returning({ id: scans.id, createdAt: scans.createdAt });

    return NextResponse.json({ id: row.id, type: "video", target: fileName, trustScore, verdict: verdictFor(trustScore), confidence, flags, signals, durationMs, createdAt: row.createdAt });
  } catch (e) {
    console.error("scan/video", e);
    return NextResponse.json({ error: "Video analysis failed unexpectedly. Please try again." }, { status: 500 });
  }
}
