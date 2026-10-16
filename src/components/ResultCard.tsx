"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { TrustGauge } from "./TrustGauge";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { ReportModal } from "./ReportModal";
import { Download, Flag, RotateCcw, Gauge, Zap, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import type { ScanFlag } from "@/db/schema";

export type ScanResult = {
  id: string;
  type: "image" | "video" | "audio" | "text";
  target: string;
  trustScore: number;
  verdict: "authentic" | "uncertain" | "manipulated";
  confidence: number;
  flags: ScanFlag[];
  signals: Record<string, string | number | boolean>;
  durationMs: number;
  createdAt?: string;
};

const SEV_STYLE: Record<string, string> = {
  high: "border-rose-400/30 bg-rose-500/10 text-rose-300",
  medium: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  low: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  info: "border-emerald-400/25 bg-emerald-500/8 text-emerald-300",
};

const SEV_ICON: Record<string, React.ReactNode> = {
  high: <AlertOctagon size={14} />,
  medium: <AlertTriangle size={14} />,
  low: <AlertCircle size={14} />,
  info: <Info size={14} />,
};

function AlertOctagon({ size }: { size: number }) {
  return <AlertCircle size={size} />;
}

const VERDICT_STYLE: Record<string, string> = {
  authentic: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  uncertain: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  manipulated: "text-rose-300 border-rose-400/30 bg-rose-500/10",
};

export function ResultCard({ result, onReset }: { result: ScanResult; onReset: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [reportOpen, setReportOpen] = useState(false);

  function downloadPdf() {
    window.open(`/api/scans/${result.id}/pdf`, "_blank", "noopener");
    toast("success", t("toast.pdfOk"));
  }

  const signalEntries = Object.entries(result.signals).filter(([, v]) => v !== "" && v !== null && v !== undefined).slice(0, 12);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 22 }}
      className="glass glow-electric relative overflow-hidden rounded-3xl p-6 sm:p-8"
      aria-label={t("result.verdict")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric-400/60 to-transparent" />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Left: gauge */}
        <div className="flex flex-col items-center gap-4">
          <TrustGauge score={result.trustScore} label={t("result.trustScore")} />
          <span className={`rounded-full border px-4 py-1.5 text-[13px] font-bold uppercase tracking-wide ${VERDICT_STYLE[result.verdict]}`}>
            {t(`result.${result.verdict}`)}
          </span>
          <div className="flex w-full max-w-[240px] flex-col gap-2">
            <div className="flex items-center justify-between text-[11.5px] text-slate-400">
              <span className="flex items-center gap-1"><Gauge size={12} /> {t("result.confidence")}</span>
              <span className="font-semibold text-slate-200">{result.confidence}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-electric-400 to-electric-600"
                initial={{ width: 0 }}
                animate={{ width: `${result.confidence}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 }}
              />
            </div>
            <div className="flex items-center justify-between text-[11.5px] text-slate-500">
              <span className="flex items-center gap-1"><Zap size={11} /> {t("result.time")}</span>
              <span>{result.durationMs} ms</span>
            </div>
          </div>
          <div className="mt-1 flex w-full max-w-[260px] flex-col gap-2">
            <button onClick={downloadPdf} className="flex items-center justify-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-lg shadow-electric-500/25 transition-all hover:bg-electric-400">
              <Download size={15} /> {t("common.downloadPdf")}
            </button>
            <div className="flex gap-2">
              <button onClick={() => setReportOpen(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-[12.5px] font-medium text-slate-300 transition-colors hover:border-rose-400/40 hover:text-rose-300">
                <Flag size={13} /> {t("history.report")}
              </button>
              <button onClick={onReset} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-[12.5px] font-medium text-slate-300 transition-colors hover:bg-white/10">
                <RotateCcw size={13} /> {t("common.newScan")}
              </button>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><CheckCircle2 size={12} className="text-emerald-400" /> {t("result.scanSaved")}</p>
        </div>

        {/* Right: flags + signals */}
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h3 className="mb-3 font-display text-[15px] font-semibold uppercase tracking-wider text-slate-300">{t("result.flags")}</h3>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {result.flags.map((f, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.07 }}
                  className={`rounded-xl border p-3 ${SEV_STYLE[f.severity] ?? SEV_STYLE.info}`}
                >
                  <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide">
                    {SEV_ICON[f.severity]}
                    {f.label}
                    <span className="ml-auto rounded-md bg-black/25 px-1.5 py-0.5 text-[9.5px] font-bold">{t(`result.${f.severity}`)}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-300/90">{f.detail}</p>
                </motion.li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-display text-[15px] font-semibold uppercase tracking-wider text-slate-300">{t("result.signals")}</h3>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {signalEntries.map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/8 bg-navy-900/60 p-3">
                  <dt className="truncate text-[10.5px] font-medium uppercase tracking-wide text-slate-500">{k}</dt>
                  <dd className="mt-0.5 truncate font-mono text-[13px] font-semibold text-electric-300">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        scanId={result.id}
        scanType={result.type}
        contentSummary={result.target}
      />
    </motion.section>
  );
}
