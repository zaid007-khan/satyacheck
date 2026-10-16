"use client";

import React from "react";
import { Radar } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function ScanLoader({ progressText }: { progressText?: string }) {
  const { t } = useI18n();
  return (
    <div className="glass relative mt-4 overflow-hidden rounded-2xl p-8 text-center" aria-live="polite" role="status">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 animate-scanline bg-gradient-to-b from-transparent via-electric-400/15 to-transparent" />
      <div className="relative mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-electric-500/15 text-electric-300">
        <Radar size={26} className="spinner" />
      </div>
      <p className="relative font-display text-[15px] font-medium text-slate-200">{progressText ?? t("common.analyzingLong")}</p>
      <div className="relative mx-auto mt-4 flex w-fit items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-electric-400" style={{ animationDelay: `${i * 180}ms` }} />
        ))}
      </div>
    </div>
  );
}
