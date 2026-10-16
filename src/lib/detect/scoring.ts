import type { ScanFlag } from "@/db/schema";

export type Verdict = "authentic" | "uncertain" | "manipulated";

export type DetectionResult = {
  type: "image" | "video" | "audio" | "text";
  target: string;
  trustScore: number; // 0-100
  verdict: Verdict;
  confidence: number; // 0-100
  flags: ScanFlag[];
  signals: Record<string, number | string | boolean>;
};

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function verdictFor(trust: number): Verdict {
  if (trust >= 70) return "authentic";
  if (trust >= 40) return "uncertain";
  return "manipulated";
}

/** Blend two fake-probabilities with weights (ws must sum to 1). */
export function blend(a: number, wa: number, b: number, wb: number): number {
  return clamp(a * wa + b * wb, 0, 1);
}

/** Confidence from how decisive the probability is + whether a neural model agreed. */
export function confidenceFor(pFake: number, modelUsed: boolean, agreement: number): number {
  const decisiveness = Math.abs(pFake - 0.5) * 2; // 0..1
  const base = 45 + decisiveness * 30;
  const modelBoost = modelUsed ? 18 : 0;
  const agreeBoost = clamp(agreement, 0, 1) * 10;
  return Math.round(clamp(base + modelBoost + agreeBoost, 30, 97));
}

export const HFField = "neuralModel";
