"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Flag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";

const REASONS = [
  "deepfake_person", "voice_clone", "misinformation", "impersonation",
  "financial_scam", "communal_hate", "election_manipulation", "other",
];

export function ReportModal({
  open, onClose, scanId, scanType, contentSummary,
}: {
  open: boolean;
  onClose: () => void;
  scanId?: string;
  scanType: string;
  contentSummary: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, notes, scanId, scanType, contentSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      toast("success", t("report.filed"));
      setNotes("");
      onClose();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : t("toast.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-navy-950/80 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="dialog" aria-modal="true" aria-label={t("report.title")}
        >
          <motion.div
            initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="glass w-full max-w-md rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/15 text-rose-300"><Flag size={16} /></span>
                <div>
                  <h2 className="font-display text-[16px] font-semibold text-white">{t("report.title")}</h2>
                  <p className="text-[12px] text-slate-400">{t("report.subtitle")}</p>
                </div>
              </div>
              <button onClick={onClose} aria-label={t("common.close")} className="text-slate-500 hover:text-slate-200"><X size={18} /></button>
            </div>

            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="report-reason" className="mb-1.5 block text-[12.5px] font-medium text-slate-300">{t("report.reason")}</label>
                <select
                  id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-navy-900/80 px-3.5 py-2.5 text-[13.5px] text-slate-200 outline-none focus:border-electric-400/50"
                >
                  {REASONS.map((r) => <option key={r} value={r}>{t(`report.${r}`)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="report-notes" className="mb-1.5 block text-[12.5px] font-medium text-slate-300">{t("report.notes")}</label>
                <textarea
                  id="report-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000}
                  placeholder={t("report.notesPh")}
                  className="w-full resize-none rounded-xl border border-white/10 bg-navy-900/80 px-3.5 py-2.5 text-[13.5px] text-slate-200 placeholder-slate-600 outline-none focus:border-electric-400/50"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-[13px] font-medium text-slate-300 hover:bg-white/10">
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-rose-500/90 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-rose-500/20 transition-colors hover:bg-rose-400 disabled:opacity-60">
                  {busy ? t("common.loading") : t("report.submit")}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
