"use client";

import React, { useRef, useState } from "react";
import { Clapperboard, Film } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { ScanLoader } from "../ScanLoader";
import type { ScanResult } from "../ResultCard";

function waitEvent(el: HTMLVideoElement, ev: string, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, timeoutMs);
    const ok = () => { cleanup(); resolve(); };
    const bad = () => { cleanup(); reject(new Error("media error")); };
    const cleanup = () => { clearTimeout(to); el.removeEventListener(ev, ok); el.removeEventListener("error", bad); };
    el.addEventListener(ev, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}

export function VideoScanner({ onResult }: { onResult: (r: ScanResult) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);

  async function analyse(file: File) {
    if (busy) return;
    setBusy(true); setThumbs([]);
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement("video");
      video.muted = true; video.playsInline = true; video.preload = "auto";
      video.src = url;
      await waitEvent(video, "loadedmetadata", 8000);
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("bad-duration");
      if (video.videoWidth < 8 || video.videoHeight < 8) throw new Error("bad-video");
      const span = Math.min(duration, 90);
      const N = Math.max(3, Math.min(8, Math.ceil(span / 2)));
      const scale = Math.min(1, 640 / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d")!;

      const frames: string[] = [];
      for (let i = 0; i < N; i++) {
        const ts = span <= 1 ? 0 : 0.06 * span + (i * 0.88 * span) / (N - 1);
        setPhase(`${t("dash.sampling")} ${i + 1}/${N}`);
        video.currentTime = Math.min(ts, duration - 0.05);
        await waitEvent(video, "seeked", 5000);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        frames.push(dataUrl);
        setThumbs((th) => [...th, dataUrl]);
      }

      setPhase(t("common.analyzing"));
      const res = await fetch("/api/scan/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, fileName: file.name, durationSec: duration, width: video.videoWidth, height: video.videoHeight }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("toast.error"));
      toast("success", t("toast.scanDone"));
      onResult(data);
    } catch (err) {
      const msg = err instanceof Error && err.message === "bad-duration"
        ? "Could not read this video's timeline — try MP4 or WebM."
        : err instanceof Error ? err.message : t("toast.error");
      toast("error", msg);
    } finally {
      setBusy(false); setPhase("");
      URL.revokeObjectURL(url);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast("error", t("dash.formatsVideo")); return; }
    if (f.size > 300 * 1024 * 1024) { toast("error", "Video is larger than 300 MB — trim the clip and retry."); return; }
    void analyse(f);
  }

  return (
    <div>
      <p className="mb-4 text-[13.5px] leading-relaxed text-slate-400">{t("dash.videoHint")}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label={t("dash.dropVideo")}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${
          drag ? "border-electric-400 bg-electric-500/10" : "border-white/12 bg-navy-900/40 hover:border-electric-400/40 hover:bg-navy-800/40"
        }`}
      >
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-electric-500/12 text-electric-300">
          <Clapperboard size={26} />
        </span>
        <p className="font-display text-[15px] font-medium text-slate-200">{t("dash.dropVideo")}</p>
        <p className="mt-1.5 text-[12px] text-slate-500">{t("dash.formatsVideo")}</p>
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => onFiles(e.target.files)} aria-hidden tabIndex={-1} />
      </div>

      {thumbs.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {thumbs.map((th, i) => (
            <img key={i} src={th} alt={`frame ${i + 1}`} className="aspect-video w-full rounded-lg border border-white/10 object-cover" />
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-center">
        <button onClick={() => inputRef.current?.click()} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-[12.5px] font-medium text-slate-300 transition-colors hover:bg-white/10">
          <Film size={14} /> {t("common.chooseFile")}
        </button>
      </div>
      {busy && <ScanLoader progressText={phase || undefined} />}
    </div>
  );
}
