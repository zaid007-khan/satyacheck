// SatyaCheck end-to-end verification harness — exercises every feature with real payloads.
import sharp from "sharp";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
let passed = 0, failed = 0;

function ok(name, cond, extra = "") {
  if (cond) { passed++; console.log(`  PASS  ${name}${extra ? " — " + extra : ""}`); }
  else { failed++; console.log(`  FAIL  ${name}${extra ? " — " + extra : ""}`); }
}

function cookieJar(res, store) {
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    store[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
}
const jarHeader = (jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

const demoJar = {}, adminJar = {};

// ---------- media generators ----------
async function makeNaturalPhotoJpeg() {
  // textured "photo": multi-blob gradient + per-pixel noise
  const W = 512, H = 512;
  const raw = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const dx = x - 200, dy = y - 180;
      const r1 = Math.max(0, 200 - Math.hypot(dx, dy) * 0.8);
      const dx2 = x - 380, dy2 = y - 400;
      const r2 = Math.max(0, 140 - Math.hypot(dx2, dy2) * 0.7);
      const n = (Math.random() - 0.5) * 24;
      raw[i] = Math.max(0, Math.min(255, 90 + x * 0.22 + r1 + n));
      raw[i + 1] = Math.max(0, Math.min(255, 110 + y * 0.18 + r1 * 0.7 + n));
      raw[i + 2] = Math.max(0, Math.min(255, 140 + r2 + n * 1.2));
    }
  }
  return sharp(raw, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 93 }).toBuffer();
}

async function makeSuspiciousPng() {
  // smooth synthetic gradient + fake generator EXIF comment
  const W = 640, H = 640;
  const raw = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      raw[i] = 200 * (x / W) + 30;
      raw[i + 1] = 190 * (y / H) + 40;
      raw[i + 2] = 210;
    }
  }
  return sharp(raw, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .withMetadata({ exif: { IFD0: { Software: "Stability.AI Stable Diffusion v2" } } })
    .toBuffer();
}

async function makeFrame(seed) {
  const W = 320, H = 180;
  const raw = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const n = (Math.random() - 0.5) * 18;
      raw[i] = Math.max(0, Math.min(255, 60 + x * 0.4 + seed * 8 + n));
      raw[i + 1] = Math.max(0, Math.min(255, 90 + y * 0.5 + n));
      raw[i + 2] = Math.max(0, Math.min(255, 130 + n));
    }
  }
  const buf = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function makeSpeechLikePcm(seconds = 4, sr = 16000) {
  // voicing with jittered pitch + amplitude modulation + breath noise
  const n = seconds * sr;
  const pcm = new Int16Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f0 = 118 + 34 * Math.sin(2 * Math.PI * 1.7 * t) + 12 * Math.sin(2 * Math.PI * 4.3 * t);
    phase += (2 * Math.PI * f0) / sr;
    const env = 0.45 + 0.55 * Math.abs(Math.sin(2 * Math.PI * 2.9 * t));
    const voiced = Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.3 * Math.sin(3.7 * phase) + 0.18 * Math.sin(6.1 * phase);
    const breath = (Math.random() - 0.5) * 0.16;
    const v = (voiced * 0.32 * env + breath * env) * 0.9;
    pcm[i] = Math.round(Math.max(-1, Math.min(1, v)) * 32767);
  }
  return Buffer.from(pcm.buffer.slice(0));
}

// ---------- tests ----------
async function main() {
  console.log(`\n=== SatyaCheck E2E @ ${BASE} ===\n`);

  // health
  const h = await fetch(`${BASE}/api/health`).then((r) => r.json());
  ok("health endpoint", h.ok === true);

  // signup fresh user
  const su = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Citizen", email: `citizen${Date.now()}@test.in`, password: "Citizen@12345" }),
  });
  ok("signup creates account", su.status === 200, `HTTP ${su.status}`);

  // signup validation
  const suBad = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "X", email: "not-an-email", password: "short" }),
  });
  ok("signup rejects bad input", suBad.status === 400);

  // login demo + admin
  const l1 = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "demo@satyacheck.in", password: "SatyaDemo@2026" }) });
  cookieJar(l1, demoJar);
  ok("demo user login", l1.status === 200 && demoJar.satya_session, `HTTP ${l1.status}`);
  const l2 = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@satyacheck.in", password: "SatyaAdmin@2026" }) });
  cookieJar(l2, adminJar);
  ok("admin login", l2.status === 200 && adminJar.satya_session, `HTTP ${l2.status}`);
  const lBad = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "demo@satyacheck.in", password: "wrong-password" }) });
  ok("login rejects wrong password", lBad.status === 401);

  // unauth guard
  const un = await fetch(`${BASE}/api/scans`);
  ok("auth guard on /api/scans", un.status === 401);

  // ---- image scans ----
  const natural = await makeNaturalPhotoJpeg();
  const f1 = new FormData();
  f1.append("file", new Blob([new Uint8Array(natural)], { type: "image/jpeg" }), "street-photo.jpg");
  const r1 = await fetch(`${BASE}/api/scan/image`, { method: "POST", headers: { cookie: jarHeader(demoJar) }, body: f1 });
  const d1 = await r1.json();
  ok("image scan (natural photo)", r1.status === 200 && typeof d1.trustScore === "number", `trust=${d1.trustScore} verdict=${d1.verdict} conf=${d1.confidence}`);

  const synth = await makeSuspiciousPng();
  const f2 = new FormData();
  f2.append("file", new Blob([new Uint8Array(synth)], { type: "image/png" }), "generated.png");
  const r2 = await fetch(`${BASE}/api/scan/image`, { method: "POST", headers: { cookie: jarHeader(demoJar) }, body: f2 });
  const d2 = await r2.json();
  ok("image scan (synthetic w/ AI EXIF)", r2.status === 200, `trust=${d2.trustScore} verdict=${d2.verdict}`);
  ok("synthetic scores lower than natural", d2.trustScore < d1.trustScore, `${d2.trustScore} < ${d1.trustScore}`);
  ok("AI metadata flag raised", (d2.flags ?? []).some((f) => /metadata/i.test(f.label)));

  const fBad = new FormData();
  fBad.append("file", new Blob([new Uint8Array(4096).fill(7)], { type: "image/png" }), "broken.png");
  const rBad = await fetch(`${BASE}/api/scan/image`, { method: "POST", headers: { cookie: jarHeader(demoJar) }, body: fBad });
  ok("corrupt image rejected gracefully", rBad.status === 422, `HTTP ${rBad.status}`);
  const fTiny = new FormData();
  fTiny.append("file", new Blob([new Uint8Array(Buffer.from("tiny"))], { type: "image/png" }), "tiny.png");
  const rTiny = await fetch(`${BASE}/api/scan/image`, { method: "POST", headers: { cookie: jarHeader(demoJar) }, body: fTiny });
  ok("tiny file rejected with size error", rTiny.status === 400, `HTTP ${rTiny.status}`);
  ok("natural photo in reasonable band", d1.trustScore >= 40, `trust=${d1.trustScore}`);

  // ---- video scan ----
  const frames = [];
  for (let i = 0; i < 6; i++) frames.push(await makeFrame(i));
  const r3 = await fetch(`${BASE}/api/scan/video`, {
    method: "POST", headers: { "Content-Type": "application/json", cookie: jarHeader(demoJar) },
    body: JSON.stringify({ frames, fileName: "viral-clip.mp4", durationSec: 12, width: 320, height: 180 }),
  });
  const d3 = await r3.json();
  ok("video scan (6 sampled frames)", r3.status === 200, `trust=${d3.trustScore} verdict=${d3.verdict} frames=${d3.signals?.framesAnalysed}`);
  const r3b = await fetch(`${BASE}/api/scan/video`, {
    method: "POST", headers: { "Content-Type": "application/json", cookie: jarHeader(demoJar) },
    body: JSON.stringify({ frames: frames.slice(0, 2), fileName: "x.mp4" }),
  });
  ok("video requires 3+ frames", r3b.status === 400);

  // ---- audio scan ----
  const pcm = makeSpeechLikePcm();
  const r4 = await fetch(`${BASE}/api/scan/audio`, {
    method: "POST", headers: { "Content-Type": "application/octet-stream", "x-sample-rate": "16000", "x-file-name": "scam-call.wav", cookie: jarHeader(demoJar) }, body: new Uint8Array(pcm),
  });
  const d4 = await r4.json();
  ok("audio scan (speech-like PCM)", r4.status === 200, `trust=${d4.trustScore} verdict=${d4.verdict} f0=${d4.signals?.f0Mean}Hz f0CV=${d4.signals?.f0CV}`);
  const r4b = await fetch(`${BASE}/api/scan/audio`, { method: "POST", headers: { "Content-Type": "application/octet-stream", "x-sample-rate": "16000", cookie: jarHeader(demoJar) }, body: new Uint8Array(200) });
  ok("too-short audio rejected", r4b.status === 400);

  // ---- text scans ----
  const fakeNews = "URGENT!!! SHARE BEFORE DELETED!! Government is giving FREE Rs 5000 to EVERYONE who clicks this link NOW!! 100% REAL, they don't want you to know!! http://bit.ly/free-money-now";
  const r5 = await fetch(`${BASE}/api/scan/text`, { method: "POST", headers: { "Content-Type": "application/json", cookie: jarHeader(demoJar) }, body: JSON.stringify({ text: fakeNews }) });
  const d5 = await r5.json();
  ok("text scan (misinformation)", r5.status === 200, `trust=${d5.trustScore} verdict=${d5.verdict}`);
  ok("misinformation flagged low trust", d5.trustScore <= 55, `trust=${d5.trustScore}`);
  ok("URL shortener flag raised", (d5.flags ?? []).some((f) => /shortener|URL/i.test(f.label + f.detail)));

  const cleanText = "According to a PIB fact check published on pib.gov.in, the Press Information Bureau confirmed the new vaccination schedule for Monday.";
  const r6 = await fetch(`${BASE}/api/scan/text`, { method: "POST", headers: { "Content-Type": "application/json", cookie: jarHeader(demoJar) }, body: JSON.stringify({ text: cleanText }) });
  const d6 = await r6.json();
  ok("text scan (credible source)", r6.status === 200, `trust=${d6.trustScore} verdict=${d6.verdict}`);
  ok("credible text scores higher", d6.trustScore > d5.trustScore, `${d6.trustScore} > ${d5.trustScore}`);

  const r6b = await fetch(`${BASE}/api/scan/text`, { method: "POST", headers: { "Content-Type": "application/json", cookie: jarHeader(demoJar) }, body: JSON.stringify({ text: "too short" }) });
  ok("too-short text rejected", r6b.status === 400);

  // ---- history ----
  const hist = await fetch(`${BASE}/api/scans`, { headers: { cookie: jarHeader(demoJar) } }).then((r) => r.json());
  ok("history lists scans", Array.isArray(hist.scans) && hist.scans.length >= 6, `${hist.scans?.length} scans`);
  const histImg = await fetch(`${BASE}/api/scans?type=image`, { headers: { cookie: jarHeader(demoJar) } }).then((r) => r.json());
  ok("history filter by type", histImg.scans?.every((s) => s.type === "image"));

  // ---- PDF ----
  const firstId = hist.scans[0].id;
  const pdfRes = await fetch(`${BASE}/api/scans/${firstId}/pdf`, { headers: { cookie: jarHeader(demoJar) } });
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  ok("PDF report downloads", pdfRes.status === 200 && pdfBuf.subarray(0, 5).toString() === "%PDF-", `${(pdfBuf.length / 1024).toFixed(1)} KB`);
  const pdfOther = await fetch(`${BASE}/api/scans/${firstId}/pdf`, { headers: { cookie: jarHeader(adminJar) } });
  ok("admin can fetch any user PDF", pdfOther.status === 200);

  // ---- report content ----
  const rep = await fetch(`${BASE}/api/reports`, {
    method: "POST", headers: { "Content-Type": "application/json", cookie: jarHeader(demoJar) },
    body: JSON.stringify({ reason: "misinformation", notes: "Received on WhatsApp family group", contentSummary: fakeNews.slice(0, 120), scanType: "text", scanId: d5.id }),
  });
  ok("report content files", rep.status === 200, `HTTP ${rep.status}`);
  const repBad = await fetch(`${BASE}/api/reports`, {
    method: "POST", headers: { "Content-Type": "application/json", cookie: jarHeader(demoJar) },
    body: JSON.stringify({ reason: "nonsense-reason" }),
  });
  ok("report validates reason", repBad.status === 400);
  const myReps = await fetch(`${BASE}/api/reports`, { headers: { cookie: jarHeader(demoJar) } }).then((r) => r.json());
  ok("user report list", myReps.reports?.length >= 1);

  // ---- admin ----
  const st = await fetch(`${BASE}/api/admin/stats`, { headers: { cookie: jarHeader(adminJar) } }).then((r) => r.json());
  ok("admin stats aggregate", typeof st.totals?.totalScans === "number" && st.byType?.length >= 4, `total=${st.totals?.totalScans} users=${st.totalUsers}`);
  const stDenied = await fetch(`${BASE}/api/admin/stats`, { headers: { cookie: jarHeader(demoJar) } });
  ok("admin route denied for normal user", stDenied.status === 403);
  const aReps = await fetch(`${BASE}/api/admin/reports`, { headers: { cookie: jarHeader(adminJar) } }).then((r) => r.json());
  ok("admin sees user reports", aReps.reports?.length >= 1);
  const repId = aReps.reports[0].id;
  const patch = await fetch(`${BASE}/api/admin/reports`, {
    method: "PATCH", headers: { "Content-Type": "application/json", cookie: jarHeader(adminJar) }, body: JSON.stringify({ id: repId, status: "resolved" }),
  });
  ok("admin resolves report", patch.status === 200);

  // ---- page render smoke tests ----
  for (const [path, label] of [["/", "landing"], ["/login", "login"], ["/signup", "signup"], ["/dashboard", "dashboard(anon redirect)"], ["/history", "history(anon redirect)"], ["/admin", "admin(anon redirect)"]]) {
    const pr = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const okStatus = [200, 307, 308].includes(pr.status);
    ok(`page ${label}`, okStatus, `HTTP ${pr.status}`);
  }

  // logout
  const lo = await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { cookie: jarHeader(demoJar) } });
  ok("logout", lo.status === 200);

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("harness error:", e); process.exit(1); });
