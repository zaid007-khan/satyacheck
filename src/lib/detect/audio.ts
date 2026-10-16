import { magnitudeSpectrum } from "./fft";
import { clamp, sigmoid } from "./scoring";
import type { ScanFlag } from "@/db/schema";

export type AudioSignals = {
  durationSec: number;
  spectralFlatness: number;
  highBandRatio: number;
  spectralFlux: number;
  zcrMean: number;
  zcrStd: number;
  silenceRatio: number;
  energyKurtosis: number;
  f0Mean: number;
  f0CV: number;
  voicedRatio: number;
};

function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}
function stdev(a: number[], m?: number): number {
  const mu = m ?? mean(a);
  return a.length ? Math.sqrt(a.reduce((s, v) => s + (v - mu) * (v - mu), 0) / a.length) : 0;
}
function kurtosis(a: number[]): number {
  if (a.length < 4) return 0;
  const mu = mean(a), sd = stdev(a, mu) || 1e-9;
  let s = 0;
  for (const v of a) s += ((v - mu) / sd) ** 4;
  return s / a.length - 3;
}
function geoMean(a: number[]): number {
  if (!a.length) return 0;
  let s = 0;
  for (const v of a) s += Math.log(v + 1e-12);
  return Math.exp(s / a.length);
}

/** Wrap mono int16 PCM (16kHz) into a RIFF/WAV buffer (for the neural model call). */
export function pcmToWav(pcm: Int16Array, sampleRate = 16000): Buffer {
  const dataSize = pcm.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < pcm.length; i++) buf.writeInt16LE(pcm[i], 44 + i * 2);
  return buf;
}

/** Voice-clone forensic DSP on 16 kHz mono PCM. */
export function analyzePcm(int16: Int16Array, sampleRate = 16000): { signals: AudioSignals; pFake: number; flags: ScanFlag[] } {
  const flags: ScanFlag[] = [];
  const sr = sampleRate;
  const win = 480, hop = 240; // 30ms / 15ms
  const nFrames = Math.max(1, Math.floor((int16.length - win) / hop) + 1);
  const frame = new Float64Array(win);
  const rms: number[] = [], zcr: number[] = [];
  const flats: number[] = [], hbRatios: number[] = [], fluxes: number[] = [];
  let prevMag: Float64Array | null = null;
  const f0s: number[] = [];

  for (let f = 0; f < nFrames; f++) {
    const off = f * hop;
    let sum = 0, crossings = 0;
    for (let i = 0; i < win; i++) {
      const v = int16[off + i] / 32768;
      // Hann window
      frame[i] = v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1)));
      sum += v * v;
      if (i > 0) {
        const a = int16[off + i - 1], b = int16[off + i];
        if ((a >= 0 && b < 0) || (a < 0 && b >= 0)) crossings++;
      }
    }
    const r = Math.sqrt(sum / win);
    rms.push(r);
    zcr.push(crossings / win);

    // spectral features on every frame up to 160 to bound cost
    if (f % Math.max(1, Math.floor(nFrames / 160)) === 0) {
      const mag = magnitudeSpectrum(frame, 512);
      const bins: number[] = [];
      for (let b = 32; b <= 224; b++) bins.push(mag[b]); // 1k–7k Hz at 512 FFT/16k sr
      const am = mean(bins);
      const flat = am > 0 ? geoMean(bins) / am : 0;
      flats.push(flat);
      let total = 0, hb = 0;
      for (let b = 3; b < 256; b++) {
        total += mag[b];
        if (b >= 128) hb += mag[b]; // ≥4 kHz
      }
      hbRatios.push(total > 0 ? hb / total : 0);
      if (prevMag) {
        let fl = 0;
        for (let b = 3; b < 256; b++) fl += Math.abs(mag[b] - prevMag[b]);
        fluxes.push(fl / 253);
      }
      prevMag = mag;

      // pitch via autocorrelation on voiced frames
      if (r > 0.01) {
        let bestLag = 0, bestVal = 0;
        for (let lag = 40; lag <= 400; lag++) {
          let ac = 0;
          for (let i = 0; i + lag < win; i += 2) ac += frame[i] * frame[i + lag];
          if (ac > bestVal) { bestVal = ac; bestLag = lag; }
        }
        if (bestLag > 0 && bestVal > 0) f0s.push(sr / bestLag);
      }
    }
  }

  const voiced = f0s.length;
  const voicedRatio = voiced / Math.max(1, flats.length);
  const sortedRms = [...rms].sort((a, b) => a - b);
  const rmsMedian = sortedRms[Math.floor(sortedRms.length / 2)] || 0;
  const silenceRatio = rms.filter((r) => r < Math.max(0.004, rmsMedian * 0.25)).length / rms.length;
  const energyKurt = kurtosis(rms);
  const f0Mean = mean(f0s);
  const f0CV = f0Mean > 0 ? stdev(f0s, f0Mean) / f0Mean : 0;
  const signals: AudioSignals = {
    durationSec: +(int16.length / sr).toFixed(2),
    spectralFlatness: +mean(flats).toFixed(4),
    highBandRatio: +mean(hbRatios).toFixed(4),
    spectralFlux: +mean(fluxes).toFixed(4),
    zcrMean: +mean(zcr).toFixed(4),
    zcrStd: +stdev(zcr).toFixed(4),
    silenceRatio: +silenceRatio.toFixed(3),
    energyKurtosis: +energyKurt.toFixed(2),
    f0Mean: +f0Mean.toFixed(1),
    f0CV: +f0CV.toFixed(3),
    voicedRatio: +voicedRatio.toFixed(3),
  };

  // --- weighted suspicion ---
  let z = 0.15;
  z += clamp((signals.spectralFlatness - 0.31) * 5.2, -0.55, 0.9);   // vocoder over-flatness / over-peaked
  z += clamp((0.045 - signals.highBandRatio) * 9.5, -0.35, 0.7);     // missing natural HF breathiness
  z += clamp((0.55 - signals.spectralFlux) * 1.1, -0.4, 0.55);       // unnaturally static timbre
  z += clamp((11.5 - energyKurt) * 0.045, -0.45, 0.4);               // flattened loudness dynamics
  if (voicedRatio > 0.25) z += clamp((0.115 - f0CV) * 4.4, -0.5, 0.65); // robotic pitch stability
  z += clamp((zcrStdFrom(zcr) - 0.028) * 11, -0.3, 0.35);
  const pFake = clamp(sigmoid(z), 0.005, 0.995);

  if (signals.spectralFlatness > 0.42)
    flags.push({ label: "Vocoder-flat spectrum", detail: "Spectral flatness exceeds natural speech — a common neural-vocoder signature.", severity: "high" });
  else if (signals.spectralFlatness < 0.18)
    flags.push({ label: "Over-peaked harmonic spectrum", detail: "Unnaturally tonal spectrum consistent with concatenative/TTS synthesis.", severity: "medium" });
  else
    flags.push({ label: "Natural spectral tilt", detail: "Spectral flatness sits inside the human speech band.", severity: "info" });

  if (signals.highBandRatio < 0.03)
    flags.push({ label: "Missing high-frequency breath detail", detail: "Frictive energy above 4kHz is absent — typical of low-bandwidth voice cloning.", severity: "high" });

  if (voicedRatio > 0.25 && f0CV < 0.09)
    flags.push({ label: "Robotic pitch contour", detail: `Pitch variation (CV=${f0CV.toFixed(3)}) is below natural prosody range.`, severity: "high" });
  else if (voicedRatio > 0.25 && f0CV < 0.14)
    flags.push({ label: "Reduced prosody dynamics", detail: "Pitch variability is lower than typical spontaneous speech.", severity: "medium" });

  if (energyKurt < 2.5)
    flags.push({ label: "Flattened loudness envelope", detail: "Energy dynamics are unnaturally even across the clip.", severity: "medium" });

  if (signals.durationSec < 1.2)
    flags.push({ label: "Very short sample", detail: "Under 1.2 seconds — confidence is limited on short clips.", severity: "info" });

  return { signals, pFake, flags };
}

function zcrStdFrom(zcr: number[]): number {
  const m = mean(zcr);
  return stdev(zcr, m);
}
