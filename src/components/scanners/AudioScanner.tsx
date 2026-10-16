"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, AudioLines, FileAudio } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { ScanLoader } from "../ScanLoader";
import type { ScanResult } from "../ResultCard";

const TARGET_SR = 16000;
const MAX_SECONDS = 25;

async function toMonoPcm(buffer: AudioBuffer): Promise<Int16Array> {
  const seconds = Math.min(buffer.duration, MAX_SECONDS);
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(seconds * TARGET_SR)), TARGET_SR);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  const f = rendered.getChannelData(0);
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const v = Math.max(-1, Math.min(1, f[i]));
    out[i] = Math.round(v * 32767);
  }
  return out;
}

function safeName(n: string): string {
  return (n || "audio").replace(/[^\x20-\x7E]/g, "_").slice(0, 120);
}

export function AudioScanner({ onResult }: { onResult: (r: ScanResult) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  async function postPcm(pcm: Int16Array, name: string) {
    const res = await fetch("/api/scan/audio", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", "x-sample-rate": String(TARGET_SR), "x-file-name": safeName(name) },
      body: pcm.buffer as ArrayBuffer,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("toast.error"));
    toast("success", t("toast.scanDone"));
    onResult(data);
  }

  async function decodeAndAnalyse(buf: ArrayBuffer, name: string) {
    const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    try {
      const audio = await ctx.decodeAudioData(buf.slice(0));
      const pcm = await toMonoPcm(audio);
      await postPcm(pcm, name);
    } finally {
      void ctx.close();
    }
  }

  async function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f || busy) return;
    setBusy(true);
    try { await decodeAndAnalyse(await f.arrayBuffer(), f.name); }
    catch (err) { toast("error", err instanceof Error ? err.message : "Could not decode this audio format — try MP3, WAV, OGG or M4A."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function startRecording() {
    if (busy || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        setBusy(true);
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          await decodeAndAnalyse(await blob.arrayBuffer(), "microphone-recording");
        } catch (err) {
          toast("error", err instanceof Error ? err.message : t("toast.error"));
        } finally {
          setBusy(false);
        }
      };
      rec.start(250);
      setRecording(true); setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) { stopRecording(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast("error", "Microphone access was denied — allow mic permission or upload an audio file instead.");
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    setRecording(false);
  }

  return (
    <div>
      <p className="mb-4 text-[13.5px] leading-relaxed text-slate-400">{t("dash.audioHint")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => inputRef.current?.click()} disabled={busy || recording}
          className="group flex min-h-[132px] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-white/12 bg-navy-900/40 p-6 text-center transition-all hover:border-electric-400/40 hover:bg-navy-800/40 disabled:opacity-50"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-electric-500/12 text-electric-300 transition-transform group-hover:scale-105"><FileAudio size={22} /></span>
          <span className="font-display text-[14px] font-medium text-slate-200">{t("dash.uploadAudio")}</span>
          <span className="text-[11.5px] text-slate-500">{t("dash.formatsAudio")}</span>
        </button>
        <button
          onClick={recording ? stopRecording : startRecording} disabled={busy}
          className={`group flex min-h-[132px] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 p-6 text-center transition-all disabled:opacity-50 ${
            recording ? "animate-rec border-rose-400/60 bg-rose-500/10" : "border-dashed border-white/12 bg-navy-900/40 hover:border-rose-400/40 hover:bg-navy-800/40"
          }`}
        >
          <span className={`grid h-12 w-12 place-items-center rounded-2xl transition-transform group-hover:scale-105 ${recording ? "bg-rose-500/20 text-rose-300" : "bg-rose-500/12 text-rose-300"}`}>
            {recording ? <Square size={20} /> : <Mic size={22} />}
          </span>
          <span className="font-display text-[14px] font-medium text-slate-200">
            {recording ? `${t("dash.stop")} — ${recSeconds}s / ${MAX_SECONDS}s` : t("dash.recordMic")}
          </span>
          {recording && <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-300"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> {t("dash.rec")}</span>}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="audio/*,video/webm,.m4a,.mp3,.wav,.ogg,.oga,.aac,.flac" className="hidden" onChange={(e) => onFiles(e.target.files)} aria-hidden tabIndex={-1} />
      {busy && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-center gap-2 text-electric-300">
            <AudioLines size={18} className="animate-pulse" />
          </div>
          <ScanLoader />
        </div>
      )}
    </div>
  );
}
