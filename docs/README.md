# SatyaCheck — AI Deepfake Detection & Digital Trust Platform

SatyaCheck is a full-stack, production-ready digital trust platform for Indian citizens. It scans
**images, videos, audio/voice and text/links** for signs of AI manipulation, reports a 0–100
**Trust Score** with explainable forensic flags, generates watermarked **PDF evidence reports**,
and includes a full **trust & safety admin dashboard**. Fully bilingual (**English / हिंदी**).

## Architecture

```
/ (repo root)
├── src/
│   ├── app/
│   │   ├── page.tsx                  Landing (live DB stats)      /dashboard  /history  /admin
│   │   ├── login|signup/             Auth pages
│   │   └── api/
│   │       ├── auth/                 signup · login · logout · me
│   │       ├── scan/                 image · video · audio · text (four detection endpoints)
│   │       ├── scans/                history list · [id]/pdf (watermarked report, on-demand)
│   │       ├── reports/              user "report this content" flags
│   │       └── admin/                stats aggregates · reports triage (role-guarded)
│   ├── components/                   Navbar · TrustGauge · ResultCard · ReportModal ·
│   │                                 scanners/{Image,Video,Audio,Text}Scanner · AdminClient · …
│   ├── db/                           Drizzle ORM (PostgreSQL): users, sessions, scans, content_reports
│   └── lib/
│       ├── auth.ts                   scrypt passwords + revocable DB sessions (httpOnly cookie)
│       ├── detect/                   FORENSIC ENGINES
│       │   ├── image.ts              2-D FFT spectral lattice, noise residual CV, JPEG 8×8 grid,
│       │   │                         ELA recompression delta, colorfulness, EXIF generator fingerprints
│       │   ├── audio.ts              spectral flatness, 4kHz breath band, spectral flux, prosody (F0 CV),
│       │   │                         loudness kurtosis, zero-crossing stats (voice-clone DSP)
│       │   ├── text.ts               stylometry + URL reputation (shorteners, IDN, misinfo domains…)
│       │   └── fft.ts                radix-2 FFT / 2-D power spectrum
│       ├── hf.ts                     Hugging Face Inference API bridge (optional, blended)
│       └── pdf.ts                    pdfkit report renderer ("VERIFIED BY SATYACHECK" watermark)
├── scripts/seed.mjs                  Creates admin + demo accounts (idempotent)
├── scripts/e2e-test.mjs              42-assertion end-to-end harness (real media payloads)
└── docs/README.md
```

## How detection works (real inference, two layers)

**Layer 1 — always-on forensic ensemble (TypeScript, server-side).** Genuine signal analysis,
not random scores:

| Medium | Signals |
|---|---|
| Image | FFT upsampling-lattice peakiness, high-frequency energy ratio, sensor-noise uniformity CV, JPEG 8×8 recompression grid, error-level analysis, color-gamut spread, EXIF provenance + AI-generator fingerprints |
| Video | Browser samples 3–12 frames along the timeline → per-frame image forensics → temporal aggregation (drift/flicker raises suspicion) |
| Audio | Decoded via Web Audio (file or mic recording), resampled to 16 kHz mono PCM → spectral flatness, ≥4 kHz breath band, spectral flux, pitch (F0) stability, loudness kurtosis |
| Text | Clickbait/urgency lexicons (EN + Hindi/Hinglish), caps & exclamation density, emoji load, URL reputation (shorteners, abusive TLDs, IP hosts, IDN look-alikes, known-misinfo + known-credible domains) |

Scores are weighted logistic combinations → **Trust Score** (≥70 authentic · 40–69 uncertain · <40 manipulated).

**Layer 2 — pretrained neural models (optional, auto-blended).** Set `HF_TOKEN` (or
`HUGGINGFACE_API_TOKEN`) and every scan additionally calls free-tier Hugging Face Inference API
models and blends 38–58 % weight into the final score:

- `dima806/deepfake_vs_real_image_detection` (Xception-Net, images/video frames)
- `mo-thecreator/Deepfake-audio-detection` (ASVspoof-based, audio)
- `hamzab/roberta-fake-news-classification` (text)

Every HF call degrades gracefully (timeout/rate-limit/warm-up → Layer-1-only with a
"signal-forensics mode" notice flag), so scans never fail.

**Privacy:** uploaded media is processed in memory and discarded immediately — only forensic
**results** (scores, flags, signals) persist, linked to the user's account. PDFs are regenerated
on demand from stored results.

## Setup

```bash
npm install
npx drizzle-kit push        # apply schema to Postgres (DATABASE_URL in .env)
node scripts/seed.mjs       # create admin + demo accounts
npm run build && npm start  # or: npm run dev
node scripts/e2e-test.mjs   # 42-assertion full-stack verification
```

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `HF_TOKEN` / `HUGGINGFACE_API_TOKEN` | optional | enables Layer-2 neural model blending |

### Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@satyacheck.in` | `SatyaAdmin@2026` |
| User | `demo@satyacheck.in` | `SatyaDemo@2026` |

## Known limitations

- **Heuristic calibration without HF_TOKEN:** Layer-1 thresholds are literature-informed estimates.
  Directionally correct on clearly-synthetic vs clearly-credible content; ambiguous material lands
  in the "uncertain" band by design. For maximal accuracy, add `HF_TOKEN`.
- **Video metadata containers:** frame sampling uses the browser decoder — exotic codecs that the
  browser itself cannot play are rejected with a clear message (MP4/WebM recommended).
- **Audio clips > 25 s** are truncated for analysis (long-form requires chunked streaming).
- Scores are **probabilistic forensic indicators**, not legal evidence.
