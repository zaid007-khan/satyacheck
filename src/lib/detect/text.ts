import { clamp, sigmoid } from "./scoring";
import type { ScanFlag } from "@/db/schema";

export type TextSignals = {
  lengthChars: number;
  urlCount: number;
  urls: string[];
  urlRisk: number;
  capsRatio: number;
  exclamPerSent: number;
  questionPerSent: number;
  emojiCount: number;
  clickbaitHits: number;
  urgencyHits: number;
  credibleHits: number;
  hindiShareHits: number;
};

const URL_RX = /(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+)/gi;

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly",
  "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy", "t.ly", "shorte.st", "adf.ly",
]);

const SUSPICIOUS_TLDS = [".xyz", ".top", ".click", ".loan", ".work", ".date", ".review", ".bid", ".stream", ".download", ".win", ".men", ".vip", ".cfd", ".quest", ".rest"];

const KNOWN_MISINFO = [
  "naturalnews.com", "infowars.com", "beforeitsnews.com", "worldnewsdailyreport.com",
  "empirenews.net", "newspunch.com", "yournewswire.com", "realfarmacy.com",
  "theonion.com", "fakingnews.firstpost.com", "indiatimesfakes.example",
];

const CREDIBLE = [
  "pib.gov.in", "pibfactcheck", "reuters.com", "apnews.com", "who.int", "mohfw.gov.in",
  "india.gov.in", "ptinews", "altnews.in", "boomlive.in", "factly.in", "vishvasnews.com",
  "bbc.com", "ndtv.com", "thehindu.com", "hindustantimes.com", "indianexpress.com", "gov.in", "nic.in",
];

const CLICKBAIT = [
  "you won't believe", "you wont believe", "shocking", "they don't want you to know",
  "share before it", "share before deleted", "forward to everyone", "viral", "must watch",
  "exposed", "100% real", "miracle cure", "secret that", "wake up", "open your eyes",
  "mainstream media won't", "gone viral", "doctors hate", "this will shock you",
  "breaking news", "share maximum", "whatsapp university",
];

const URGENCY = [
  "urgent", "act now", "immediately", "before midnight", "last chance", "warning",
  "alert", "emergency", "share karo", "aage bhejo", "forward karo", "forward karein",
  "jaldi karo", "sab ko bhejo", "dekh lo", "sun lo",
];

const HINDI_SHARE = [
  "aage bhejo", "share karo", "forward karo", "sabko batao", "viral karo", "whatsapp par bhejo",
  "ye sach hai", "sarkar chhupa", "koi nahi batayega",
];

function analyzeUrl(raw: string): { risk: number; notes: string[] } {
  const notes: string[] = [];
  let risk = 0;
  let url: URL;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try { url = new URL(withProto); } catch { return { risk: 0.6, notes: [`Malformed URL: ${raw.slice(0, 60)}`] }; }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (url.protocol === "http:") { risk += 0.12; notes.push(`Insecure http://${host}`); }
  if (SHORTENERS.has(host)) { risk += 0.3; notes.push(`Link shortener hides destination (${host})`); }
  if (SUSPICIOUS_TLDS.some((t) => host.endsWith(t))) { risk += 0.2; notes.push(`High-abuse TLD on ${host}`); }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) { risk += 0.3; notes.push("IP-literal host instead of domain"); }
  if (/[^\x00-\x7F]/.test(host) || host.includes("xn--")) { risk += 0.25; notes.push(`Possible look-alike/IDN domain ${host}`); }
  if (host.split(".").length >= 4) { risk += 0.15; notes.push(`Deep subdomain chain (${host})`); }
  if (KNOWN_MISINFO.some((d) => host === d || host.endsWith(`.${d}`))) { risk += 0.5; notes.push(`${host} is a documented misinformation source`); }
  if (CREDIBLE.some((d) => host === d || host.endsWith(`.${d}`))) { risk -= 0.25; notes.push(`${host} is a recognised credible/fact-check source`); }
  if ((raw.match(/[?&](utm_|fbclid|ref=)/i) ?? []).length > 0) { risk += 0.03; }
  return { risk: clamp(risk, 0, 1), notes };
}

export function analyzeText(text: string): { signals: TextSignals; pFake: number; flags: ScanFlag[]; flagsExtra: string[] } {
  const flags: ScanFlag[] = [];
  const extraNotes: string[] = [];
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const urls = (trimmed.match(URL_RX) ?? []).slice(0, 8);
  let urlRiskSum = 0;
  for (const u of urls) {
    const { risk, notes } = analyzeUrl(u);
    urlRiskSum += risk;
    extraNotes.push(...notes);
  }
  const urlRisk = urls.length ? urlRiskSum / urls.length : 0;

  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  const caps = trimmed.replace(/[^A-Z]/g, "").length;
  const capsRatio = letters.length > 24 ? caps / letters.length : 0;

  const sentences = Math.max(1, trimmed.split(/[.!?\n।]+/).filter((s) => s.trim().length > 0).length);
  const exclam = (trimmed.match(/!/g) ?? []).length;
  const question = (trimmed.match(/\?/g) ?? []).length;
  const exclamPerSent = exclam / sentences;
  const questionPerSent = question / sentences;

  const emojiCount = (trimmed.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu) ?? []).length;

  const clickbaitHits = CLICKBAIT.filter((p) => lower.includes(p)).length;
  const urgencyHits = URGENCY.filter((p) => lower.includes(p)).length;
  const hindiShareHits = HINDI_SHARE.filter((p) => lower.includes(p)).length;
  const credibleHits = CREDIBLE.filter((d) => lower.includes(d)).length;

  let z = -0.55;
  z += clamp(clickbaitHits * 0.5, 0, 1.5);
  z += clamp(urgencyHits * 0.4, 0, 1.2);
  z += clamp(hindiShareHits * 0.45, 0, 0.9);
  z += clamp((exclamPerSent - 0.4) * 0.9, -0.2, 0.8);
  z += clamp((capsRatio - 0.09) * 3.2, -0.25, 0.85);
  z += clamp((emojiCount - 2) * 0.07, -0.1, 0.6);
  z += clamp(urlRisk * 1.9, -0.45, 1.9);
  z -= clamp(credibleHits * 0.5, 0, 1.0);
  if (trimmed.length < 40 && urls.length === 0) z -= 0.4; // not enough to condemn plain short text
  const pFake = clamp(sigmoid(z), 0.005, 0.995);

  for (const note of extraNotes.slice(0, 6)) {
    const sev = /misinformation|look-alike|IP-literal|shortener|abuse/.test(note) ? "high" : "medium";
    flags.push({ label: "URL reputation signal", detail: note, severity: sev });
  }
  if (clickbaitHits > 0)
    flags.push({ label: "Sensational/manipulative phrasing", detail: `${clickbaitHits} clickbait pattern(s) matched (e.g. “share before deleted”, “100% real”).`, severity: clickbaitHits >= 2 ? "high" : "medium" });
  if (urgencyHits > 0 || hindiShareHits > 0)
    flags.push({ label: "Coerced-sharing pressure", detail: "Urgency or mass-forwarding phrases typical of viral misinformation chains.", severity: "medium" });
  if (exclamPerSent > 1.2)
    flags.push({ label: "Excessive exclamation", detail: `${exclamPerSent.toFixed(1)} exclamation marks per sentence — emotional amplification.`, severity: "medium" });
  if (capsRatio > 0.22)
    flags.push({ label: "ALL-CAPS emphasis", detail: `${(capsRatio * 100).toFixed(0)}% of letters are capitalised.`, severity: "medium" });
  if (credibleHits > 0)
    flags.push({ label: "Credible source referenced", detail: "Text references recognised fact-check or official sources.", severity: "info" });
  if (urls.length === 0 && clickbaitHits === 0 && urgencyHits === 0)
    flags.push({ label: "Neutral composition", detail: "No manipulative lexical patterns or risky links detected.", severity: "info" });

  const signals: TextSignals = {
    lengthChars: trimmed.length,
    urlCount: urls.length,
    urls: urls.slice(0, 4),
    urlRisk: +urlRisk.toFixed(3),
    capsRatio: +capsRatio.toFixed(3),
    exclamPerSent: +exclamPerSent.toFixed(2),
    questionPerSent: +questionPerSent.toFixed(2),
    emojiCount,
    clickbaitHits,
    urgencyHits,
    credibleHits,
    hindiShareHits,
  };
  return { signals, pFake, flags, flagsExtra: extraNotes };
}
