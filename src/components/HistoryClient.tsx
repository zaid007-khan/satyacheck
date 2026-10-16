"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Download, Flag, History, Image as ImageIcon, Clapperboard, AudioWaveform, FileText, Inbox } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { ReportModal } from "./ReportModal";
import type { ScanFlag } from "@/db/schema";

type Row = {
  id: string;
  type: "image" | "video" | "audio" | "text";
  target: string;
  trustScore: number;
  verdict: "authentic" | "uncertain" | "manipulated";
  confidence: number;
  flags: ScanFlag[];
  durationMs: number;
  createdAt: string;
};

const TYPE_ICON: Record<string, React.ElementType> = {
  image: ImageIcon, video: Clapperboard, audio: AudioWaveform, text: FileText,
};

const VERDICT_STYLE: Record<string, string> = {
  authentic: "text-emerald-300 border-emerald-400/25 bg-emerald-500/8",
  uncertain: "text-amber-300 border-amber-400/25 bg-amber-500/8",
  manipulated: "text-rose-300 border-rose-400/25 bg-rose-500/8",
};

function scoreColor(s: number) {
  return s >= 70 ? "#34d399" : s >= 40 ? "#fbbf24" : "#fb7185";
}

export function HistoryClient() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [reportFor, setReportFor] = useState<Row | null>(null);

  useEffect(() => {
    let live = true;
    setRows(null);
    fetch(`/api/scans${filter === "all" ? "" : `?type=${filter}`}`)
      .then((r) => r.json())
      .then((d) => { if (live) setRows(d.scans ?? []); })
      .catch(() => { if (live) { setRows([]); toast("error", t("toast.error")); } });
    return () => { live = false; };
  }, [filter, toast, t]);

  const FILTERS = useMemo(() => ["all", "image", "video", "audio", "text"], []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-electric-300">
          <History size={17} />
          <span className="text-[11px] font-bold uppercase tracking-[0.24em]">SatyaCheck Vault</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("history.title")}</h1>
        <p className="mt-1.5 text-[14px] text-slate-400">{t("history.subtitle")}</p>
      </motion.header>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by type">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f} role="tab" aria-selected={active} onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold capitalize transition-all ${
                active ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25" : "border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f === "all" ? t("history.all") : t(`tabs.${f}`)}
            </button>
          );
        })}
      </div>

      {rows === null ? (
        <div className="glass rounded-3xl p-10 text-center text-slate-500">{t("common.loading")}</div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-3xl p-14 text-center">
          <Inbox size={36} className="mx-auto mb-3 text-slate-600" />
          <p className="text-[14px] text-slate-400">{t("history.empty")}</p>
          <Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-electric-500 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-electric-500/25 hover:bg-electric-400">
            {t("nav.verify")}
          </Link>
        </div>
      ) : (
        <motion.ul initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="grid gap-3">
          {rows.map((row) => {
            const Icon = TYPE_ICON[row.type] ?? FileText;
            const d = new Date(row.createdAt);
            return (
              <motion.li key={row.id} variants={{ hide: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                <div className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-3.5 sm:w-[52%]">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-electric-500/12 text-electric-300">
                      <Icon size={19} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-slate-200" title={row.target}>{row.target || row.type}</p>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">
                        {t(`tabs.${row.type}`)} • {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-3 sm:justify-end">
                    <span className="font-display text-xl font-bold" style={{ color: scoreColor(row.trustScore) }}>
                      {row.trustScore}
                      <span className="ml-0.5 text-[10px] font-medium text-slate-500">/100</span>
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${VERDICT_STYLE[row.verdict]}`}>
                      {t(`result.${row.verdict}`)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { window.open(`/api/scans/${row.id}/pdf`, "_blank", "noopener"); toast("success", t("toast.pdfOk")); }}
                        aria-label={`${t("history.pdf")} ${row.target}`}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-300 transition-colors hover:border-electric-400/40 hover:text-electric-300"
                      >
                        <Download size={13} /> {t("history.pdf")}
                      </button>
                      <button
                        onClick={() => setReportFor(row)}
                        aria-label={`${t("history.report")} ${row.target}`}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-300 transition-colors hover:border-rose-400/40 hover:text-rose-300"
                      >
                        <Flag size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      {reportFor && (
        <ReportModal
          open={!!reportFor}
          onClose={() => setReportFor(null)}
          scanId={reportFor.id}
          scanType={reportFor.type}
          contentSummary={reportFor.target}
        />
      )}
    </div>
  );
}
