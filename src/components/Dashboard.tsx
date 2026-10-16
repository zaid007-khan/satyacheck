"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, Clapperboard, AudioWaveform, FileText, ShieldCheck, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ImageScanner } from "./scanners/ImageScanner";
import { VideoScanner } from "./scanners/VideoScanner";
import { AudioScanner } from "./scanners/AudioScanner";
import { TextScanner } from "./scanners/TextScanner";
import { ResultCard, type ScanResult } from "./ResultCard";

type Tab = "image" | "video" | "audio" | "text";

const TABS: { id: Tab; icon: React.ElementType }[] = [
  { id: "image", icon: ImageIcon },
  { id: "video", icon: Clapperboard },
  { id: "audio", icon: AudioWaveform },
  { id: "text", icon: FileText },
];

export function Dashboard() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("image");
  const [results, setResults] = useState<Partial<Record<Tab, ScanResult>>>({});

  const result = results[tab];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-electric-300">
          <ShieldCheck size={17} />
          <span className="text-[11px] font-bold uppercase tracking-[0.24em]">SatyaCheck Forensic Lab</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("dash.title")}</h1>
        <p className="mt-1.5 text-[14px] text-slate-400">{t("dash.subtitle")}</p>
      </motion.header>

      {/* Tabs */}
      <div role="tablist" aria-label="Detection type" className="mb-6 grid grid-cols-4 gap-1.5 rounded-2xl border border-white/8 bg-navy-900/70 p-1.5">
        {TABS.map(({ id, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id} role="tab" aria-selected={active} aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-[11px] font-semibold transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:text-[13px] ${
                active ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-electric-500 to-electric-600 shadow-lg shadow-electric-500/25" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <Icon size={16} className="relative z-10" aria-hidden />
              <span className="relative z-10">{t(`tabs.${id}`)}</span>
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab + (result ? "-r" : "-s")}
          id={`panel-${tab}`} role="tabpanel"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {result ? (
            <ResultCard result={result} onReset={() => setResults((r) => ({ ...r, [tab]: undefined }))} />
          ) : (
            <div className="glass rounded-3xl p-6 sm:p-8">
              {tab === "image" && <ImageScanner onResult={(r) => setResults((s) => ({ ...s, image: r }))} />}
              {tab === "video" && <VideoScanner onResult={(r) => setResults((s) => ({ ...s, video: r }))} />}
              {tab === "audio" && <AudioScanner onResult={(r) => setResults((s) => ({ ...s, audio: r }))} />}
              {tab === "text" && <TextScanner onResult={(r) => setResults((s) => ({ ...s, text: r }))} />}
              <p className="mt-5 flex items-start gap-2 rounded-xl border border-white/6 bg-navy-950/50 p-3.5 text-[11.5px] leading-relaxed text-slate-500">
                <Lock size={13} className="mt-0.5 shrink-0 text-slate-600" aria-hidden />
                Your media is processed in-memory and deleted immediately after analysis — only the forensic results are stored, linked to your account.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
