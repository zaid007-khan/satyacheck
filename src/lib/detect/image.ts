import sharp from "sharp";
import { powerSpectrum2D } from "./fft";
import { clamp, sigmoid } from "./scoring";
import type { ScanFlag } from "@/db/schema";

export type ImageSignals = {
  spectralPeakiness: number;
  highFreqRatio: number;
  jpegGridRatio: number;
  elaMean: number;
  noiseUniformityCV: number;
  colorfulness: number;
  entropy: number;
  hasExif: boolean;
  aiMetadataHit: string;
};

const AI_GENERATOR_TOKENS = [
  "midjourney", "dall-e", "dalle", "stable diffusion", "stablediffusion", "stability.ai",
  "firefly", "adobe firefly", "comfyui", "automatic1111", "invokeai", "novelai",
  "leonardo ai", "leonardo.ai", "playground", "craiyon", "deepai", "nightcafe",
  "bing image creator", "imagen", "ideogram", "flux", "recraft", "bluewillow",
];

function toFloat(buf: Buffer): Float64Array {
  const out = new Float64Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i];
  return out;
}

function mean(a: number[] | Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return a.length ? s / a.length : 0;
}

function stddev(a: number[] | Float64Array, m?: number): number {
  const mu = m ?? mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - mu) * (a[i] - mu);
  return a.length ? Math.sqrt(s / a.length) : 0;
}

/** Extract forensic signals from an image buffer (jpeg/png/webp/avif). */
export async function analyzeImage(buffer: Buffer): Promise<{ signals: ImageSignals; pFake: number; flags: ScanFlag[] }> {
  const flags: ScanFlag[] = [];
  const img = sharp(buffer, { failOn: "error" });
  const meta = await img.metadata();

  // --- Metadata / EXIF provenance -------------------------------------------------
  let exifText = "";
  if (meta.exif) {
    try { exifText = meta.exif.toString("latin1").toLowerCase(); } catch { exifText = ""; }
  }
  const aiHit = AI_GENERATOR_TOKENS.find((t) => exifText.includes(t)) ?? null;
  const gentleCompliant = Math.max(2, meta.width ?? 2, meta.height ?? 2);
  void gentleCompliant;
  const hasExif = !!meta.exif && meta.exif.length > 64;

  if (aiHit) {
    flags.push({ label: "AI generator fingerprint in metadata", detail: `EXIF/profile references “${aiHit}”.`, severity: "high" });
  } else if (!hasExif) {
    flags.push({ label: "No camera EXIF provenance", detail: "Missing capture metadata that genuine phone photos usually carry.", severity: "low" });
  } else {
    flags.push({ label: "Capture metadata present", detail: "EXIF block found with no known generator signatures.", severity: "info" });
  }

  // --- Small grayscale patch for spectral & noise analysis ------------------------
  const N = 128;
  const grayRaw = await sharp(buffer).grayscale().resize(N, N, { fit: "fill" }).raw().toBuffer();
  const g = toFloat(grayRaw);

  // Spectral energy distribution — GAN/diffusion upsamplers imprint lattice spikes.
  const spec = powerSpectrum2D(g, N);
  const center = N / 2;
  let highEnergy = 0, totalEnergy = 0;
  const mags: number[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const r = Math.hypot(x - center, y - center);
      const v = spec[y * N + x];
      if (r < 6) continue; // skip DC neighborhood
      totalEnergy += v;
      mags.push(v);
      if (r >= 40) highEnergy += v;
    }
  }
  const highFreqRatio = totalEnergy > 0 ? highEnergy / totalEnergy : 0;
  const sorted = [...mags].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1e-9;
  const top = sorted.slice(-12).reduce((s, v) => s + v, 0) / 12;
  const spectralPeakiness = top / (median + 1e-9); // lattice spikes >> median

  // --- 8x8 JPEG blockiness on native resolution (capped) ---------------------------
  const capW = Math.min(meta.width ?? 512, 512);
  const capH = Math.min(meta.height ?? 512, 512);
  const natRaw = await sharp(buffer).grayscale().resize(capW, capH, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const nat = toFloat(natRaw.data);
  const w = natRaw.info.width, h = natRaw.info.height;
  let gridSum = 0, gridCnt = 0, offSum = 0, offCnt = 0;
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const d = Math.abs(nat[y * w + x] - nat[y * w + x - 1]);
      if (x % 8 === 0) { gridSum += d; gridCnt++; } else { offSum += d; offCnt++; }
    }
  }
  const jpegGridRatio = gridCnt && offCnt ? (gridSum / gridCnt) / (offSum / offCnt + 1e-9) : 1;

  // --- Noise residual uniformity ----------------------------------------------------
  // residual = pixel - 3x3 box mean; camera noise scales with luminance, synthetic noise is often uniform
  const blockStds: number[] = [];
  const B = 16; // 16px blocks on the 128 grid
  for (let by = 0; by < N / B; by++) {
    for (let bx = 0; bx < N / B; bx++) {
      const resid: number[] = [];
      for (let y = by * B + 1; y < by * B + B - 1; y++) {
        for (let x = bx * B + 1; x < bx * B + B - 1; x++) {
          const i = y * N + x;
          const m = (g[i - 1] + g[i + 1] + g[i - N] + g[i + N]) / 4;
          resid.push(g[i] - m);
        }
      }
      blockStds.push(stddev(resid));
    }
  }
  const noiseMean = mean(blockStds);
  const noiseUniformityCV = noiseMean > 0 ? stddev(blockStds, noiseMean) / noiseMean : 0;

  // --- Error Level Analysis (recompression delta) ------------------------------------
  const recompressed = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  const elaRaw = await sharp(recompressed).grayscale().resize(N, N, { fit: "fill" }).raw().toBuffer();
  let elaSum = 0;
  for (let i = 0; i < elaRaw.length; i++) elaSum += Math.abs(elaRaw[i] - grayRaw[i]);
  const elaMean = elaSum / elaRaw.length;

  // --- Colorfulness & entropy ----------------------------------------------------------
  const rgbRaw = await sharp(buffer).resize(64, 64, { fit: "fill" }).raw().toBuffer();
  let rgMean = 0, ybMean = 0;
  const rgs: number[] = [], ybs: number[] = [];
  for (let i = 0; i < rgbRaw.length; i += 3) {
    const rg = rgbRaw[i] - rgbRaw[i + 1];
    const yb = 0.5 * (rgbRaw[i] + rgbRaw[i + 1]) - rgbRaw[i + 2];
    rgs.push(rg); ybs.push(yb); rgMean += rg; ybMean += yb;
  }
  rgMean /= rgs.length; ybMean /= ybs.length;
  const colorfulness = Math.sqrt(stddev(rgs, rgMean) ** 2 + stddev(ybs, ybMean) ** 2) + 0.3 * Math.sqrt(rgMean ** 2 + ybMean ** 2);
  const stats = await sharp(buffer).stats();
  const entropy = stats.entropy ?? 0;

  // --- Weighted scoring -----------------------------------------------------------------
  // Each term raises (positive => more likely synthetic) or lowers probability.
  let z = -0.7;
  z += clamp((spectralPeakiness - 30) / 90, -0.45, 1) * 1.7;  // lattice spikes
  z += clamp((highFreqRatio - 0.2) * 4.2, -0.5, 0.6);         // abnormal HF shelf
  z += clamp((0.13 - noiseUniformityCV) * 4.8, -0.5, 0.62);   // unnaturally uniform noise
  z += clamp((1.015 - jpegGridRatio) * 4.0, -0.4, 0.42);      // no JPEG recompression grid
  z += clamp((elaMean - 8) / 30, -0.35, 0.4);                 // high ELA on first-gen visuals
  z += clamp((colorfulness - 48) / 70, -0.25, 0.35);          // hyper-saturated output
  if (aiHit) z += 3.2;
  else if (!hasExif) z += 0.25;
  else z -= 0.7;
  const pFake = clamp(sigmoid(z), 0.005, 0.995);

  // Interpretive flags from thresholds
  if (spectralPeakiness > 55)
    flags.push({ label: "Synthetic spectral lattice detected", detail: "FFT shows periodic spikes typical of generator upsampling.", severity: "high" });
  else if (spectralPeakiness > 34)
    flags.push({ label: "Mild spectral periodicity", detail: "Some frequency regularity consistent with AI upscalers.", severity: "medium" });
  else
    flags.push({ label: "Natural frequency decay", detail: "Power spectrum decays like a natural photograph.", severity: "info" });

  if (noiseUniformityCV < 0.12)
    flags.push({ label: "Unnaturally uniform noise field", detail: "Pixel noise lacks luminance-dependent camera variation.", severity: "high" });
  else if (noiseUniformityCV < 0.22)
    flags.push({ label: "Smoothed sensor noise", detail: "Noise residual is smoother than typical camera output.", severity: "medium" });

  if (jpegGridRatio < 1.004 && (meta.format === "png" || meta.format === "webp"))
    flags.push({ label: "No JPEG compression history", detail: "Lossless-first output — common for generated imagery, screenshots and edits.", severity: "medium" });

  if (colorfulness > 62)
    flags.push({ label: "Hyper-saturated color distribution", detail: "Color spread exceeds typical camera gamut statistics.", severity: "medium" });

  return {
    signals: {
      spectralPeakiness: +spectralPeakiness.toFixed(2),
      highFreqRatio: +highFreqRatio.toFixed(4),
      jpegGridRatio: +jpegGridRatio.toFixed(4),
      elaMean: +elaMean.toFixed(2),
      noiseUniformityCV: +noiseUniformityCV.toFixed(3),
      colorfulness: +colorfulness.toFixed(1),
      entropy: +entropy.toFixed(2),
      hasExif,
      aiMetadataHit: aiHit ?? "",
    },
    pFake,
    flags,
  };
}
