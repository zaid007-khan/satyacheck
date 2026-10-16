// Hugging Face Inference API bridge — real pretrained models, blended with local forensics.
// Active when HF_TOKEN (or HUGGINGFACE_API_TOKEN) is configured. Every call degrades
// gracefully (returns null) on timeout / rate-limit / model warmup so scans never fail.

const MODELS = {
  image: "dima806/deepfake_vs_real_image_detection",
  audio: "mo-thecreator/Deepfake-audio-detection",
  text: "hamzab/roberta-fake-news-classification",
} as const;

export function hfEnabled(): boolean {
  return !!(process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN);
}

type HFLabel = { label: string; score: number };

async function call(model: string, init: RequestInit, timeoutMs = 15000): Promise<unknown | null> {
  const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN;
  if (!token) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      ...init,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function labelsFrom(raw: unknown): HFLabel[] {
  if (Array.isArray(raw) && Array.isArray(raw[0])) return raw[0] as HFLabel[];
  if (Array.isArray(raw)) return raw as HFLabel[];
  return [];
}

function fakeProbFrom(labels: HFLabel[]): number | null {
  if (!labels.length) return null;
  const sorted = [...labels].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const l = top.label.toLowerCase();
  if (/(fake|spoof|deepfake|generated|ai|label_1|bonafide-fake)/.test(l) && !/real|bonafide/.test(l)) return top.score;
  if (/(real|true|bona|genuine|bonafide|label_0|authentic)/.test(l)) return 1 - top.score;
  return null;
}

export async function hfImageDeepfake(buffer: Buffer, mime: string): Promise<{ pFake: number; label: string } | null> {
  const raw = await call(MODELS.image, {
    method: "POST",
    headers: { "Content-Type": mime },
    body: new Uint8Array(buffer),
  });
  const p = fakeProbFrom(labelsFrom(raw));
  if (p == null) return null;
  return { pFake: p, label: "dima806/deepfake_vs_real_image_detection" };
}

export async function hfAudioDeepfake(wav: Buffer): Promise<{ pFake: number; label: string } | null> {
  const raw = await call(MODELS.audio, {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: new Uint8Array(wav),
  });
  const p = fakeProbFrom(labelsFrom(raw));
  if (p == null) return null;
  return { pFake: p, label: "mo-thecreator/Deepfake-audio-detection" };
}

export async function hfTextFakeNews(text: string): Promise<{ pFake: number; label: string } | null> {
  const raw = await call(MODELS.text, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: text.slice(0, 1800) }),
  });
  const p = fakeProbFrom(labelsFrom(raw));
  if (p == null) return null;
  return { pFake: p, label: "hamzab/roberta-fake-news-classification" };
}
