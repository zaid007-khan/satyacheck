import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { analyzePcm, pcmToWav } from "@/lib/detect/audio";
import { hfAudioDeepfake, hfEnabled } from "@/lib/hf";
import { blend, confidenceFor, verdictFor } from "@/lib/detect/scoring";

const MAX_PCM_BYTES = 900 * 1024; // ~28 s of 16 kHz mono int16

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const started = Date.now();
  try {
    const sampleRate = Math.min(48000, Math.max(8000, Number(req.headers.get("x-sample-rate")) || 16000));
    const fileName = (req.headers.get("x-file-name") || "audio").slice(0, 160);
    const body = await req.arrayBuffer();
    if (body.byteLength === 0)
      return NextResponse.json({ error: "No audio data received." }, { status: 400 });
    if (body.byteLength > MAX_PCM_BYTES)
      return NextResponse.json({ error: "Audio is too long — keep clips under 25 seconds." }, { status: 413 });
    if (body.byteLength < sampleRate * 2 * 0.5)
      return NextResponse.json({ error: "Clip is too short — record at least half a second of speech." }, { status: 400 });

    const int16 = new Int16Array(body.slice(0, body.byteLength - (body.byteLength % 2)));
    const local = analyzePcm(int16, sampleRate);

    let modelP: number | null = null;
    if (hfEnabled()) {
      const hf = await hfAudioDeepfake(pcmToWav(int16, sampleRate));
      if (hf) modelP = hf.pFake;
    }
    const pFake = modelP == null ? local.pFake : blend(modelP, 0.58, local.pFake, 0.42);
    const agreement = modelP == null ? 0.5 : 1 - Math.abs(modelP - local.pFake);
    const trustScore = Math.round((1 - pFake) * 100);
    const durationMs = Date.now() - started;
    const confidence = confidenceFor(pFake, modelP != null, agreement);

    const flags = [...local.flags];
    flags.push(
      modelP != null
        ? { label: "Neural model corroborated", detail: `ASVspoof deepfake-audio classifier scored ${(modelP * 100).toFixed(0)}% clone-probability.`, severity: "info" }
        : { label: "Signal-forensics mode", detail: "DSP ensemble (spectral flatness, prosody, breath band, loudness dynamics). Add HF_TOKEN to blend the neural classifier.", severity: "info" }
    );

    const signals = { ...local.signals, neuralModel: modelP != null ? +modelP.toFixed(3) : "offline" };
    const [row] = await db
      .insert(scans)
      .values({ userId: user.id, type: "audio", target: fileName, trustScore, verdict: verdictFor(trustScore), confidence, flags, signals, durationMs })
      .returning({ id: scans.id, createdAt: scans.createdAt });

    return NextResponse.json({ id: row.id, type: "audio", target: fileName, trustScore, verdict: verdictFor(trustScore), confidence, flags, signals, durationMs, createdAt: row.createdAt });
  } catch (e) {
    console.error("scan/audio", e);
    return NextResponse.json({ error: "Audio analysis failed unexpectedly. Please try again." }, { status: 500 });
  }
}
