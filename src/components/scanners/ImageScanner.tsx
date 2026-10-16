"use client";

import React, { useRef, useState } from "react";
import { ImageUp, Camera, FileImage } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { ScanLoader } from "../ScanLoader";
import type { ScanResult } from "../ResultCard";

export function ImageScanner({ onResult }: { onResult: (r: ScanResult) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function analyse(file: File) {
    if (busy) return;
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/scan/image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("toast.error"));
      toast("success", t("toast.scanDone"));
      onResult(data);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : t("toast.error"));
      setPreview(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast("error", t("dash.formatsImage")); return; }
    void analyse(f);
  }

  return (
    <div>
      <p className="mb-4 text-[13.5px] leading-relaxed text-slate-400">{t("dash.imageHint")}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label={t("dash.dropImage")}
        className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${
          drag ? "border-electric-400 bg-electric-500/10" : "border-white/12 bg-navy-900/40 hover:border-electric-400/40 hover:bg-navy-800/40"
        }`}
      >
        {preview ? (
          <img src={preview} alt="Selected" className="mx-auto max-h-52 rounded-xl object-contain shadow-2xl" />
        ) : (
          <>
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-electric-500/12 text-electric-300">
              <ImageUp size={26} />
            </span>
            <p className="font-display text-[15px] font-medium text-slate-200">{t("dash.dropImage")}</p>
            <p className="mt-1.5 text-[12px] text-slate-500">{t("dash.formatsImage")}</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(e) => onFiles(e.target.files)} aria-hidden tabIndex={-1} />
      </div>
      <div className="mt-3 flex justify-center gap-2.5">
        <button onClick={() => inputRef.current?.click()} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-[12.5px] font-medium text-slate-300 transition-colors hover:bg-white/10">
          <FileImage size={14} /> {t("common.chooseFile")}
        </button>
        <button onClick={() => camRef.current?.click()} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-electric-400/25 bg-electric-500/10 px-4 py-2 text-[12.5px] font-medium text-electric-300 transition-colors hover:bg-electric-500/20">
          <Camera size={14} /> {t("dash.capture")}
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} aria-hidden tabIndex={-1} />
      </div>
      {busy && <ScanLoader />}
    </div>
  );
}
