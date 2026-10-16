"use client";

import React, { useState } from "react";
import { FileText, Link2, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { ScanLoader } from "../ScanLoader";
import type { ScanResult } from "../ResultCard";

export function TextScanner({ onResult }: { onResult: (r: ScanResult) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/scan/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("toast.error"));
      toast("success", t("toast.scanDone"));
      onResult(data);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : t("toast.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-[13.5px] leading-relaxed text-slate-400">{t("dash.textHint")}</p>
      <form onSubmit={analyse}>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 text-slate-600">
            <FileText size={16} /><Link2 size={13} />
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={8000}
            placeholder={t("dash.textPlaceholder")}
            aria-label={t("tabs.text")}
            className="w-full resize-y rounded-2xl border border-white/12 bg-navy-900/60 p-4 pl-14 text-[14px] leading-relaxed text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-electric-400/50"
          />
          <span className="absolute bottom-3 right-3.5 text-[11px] text-slate-600">{text.length}/8000</span>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit" disabled={busy || text.trim().length < 12}
            className="flex items-center gap-2 rounded-xl bg-electric-500 px-6 py-2.5 text-[13.5px] font-semibold text-white shadow-lg shadow-electric-500/25 transition-all hover:bg-electric-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={14} /> {t("dash.analyseText")}
          </button>
        </div>
      </form>
      {busy && <ScanLoader />}
    </div>
  );
}
