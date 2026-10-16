"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ShieldCheck, Image as ImageIcon, Clapperboard, AudioWaveform, FileText,
  ArrowRight, UploadCloud, Radar, GaugeCircle, Flag, FileDown, Users,
  ScanSearch, Sparkles, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { LandingStats } from "@/app/page";

const fadeUp = {
  hide: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 90, damping: 18 } },
};

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1300;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return <span ref={ref}>{display.toLocaleString()}</span>;
}

function HeroConsole() {
  const { t } = useI18n();
  const chips = [
    { icon: ImageIcon, label: t("tabs.image"), color: "text-sky-300 border-sky-400/25 bg-sky-500/8" },
    { icon: Clapperboard, label: t("tabs.video"), color: "text-indigo-300 border-indigo-400/25 bg-indigo-500/8" },
    { icon: AudioWaveform, label: t("tabs.audio"), color: "text-emerald-300 border-emerald-400/25 bg-emerald-500/8" },
    { icon: FileText, label: t("tabs.text"), color: "text-amber-300 border-amber-400/25 bg-amber-500/8" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="glass relative overflow-hidden rounded-3xl p-6 shadow-2xl shadow-black/40"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-scanline bg-gradient-to-b from-transparent via-electric-400/12 to-transparent" />
      <div className="relative mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-electric-500/15 text-electric-300"><Radar size={16} className="spinner" style={{ animationDuration: "3s" }} /></span>
          <span className="font-display text-[13.5px] font-semibold text-white">{t("landing.heroCardTitle")}</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live
        </span>
      </div>

      <div className="relative mx-auto mb-5 grid h-44 w-44 place-items-center">
        <div className="absolute inset-0 rounded-full border border-electric-400/15" />
        <div className="absolute inset-4 rounded-full border border-electric-400/25" />
        <div className="absolute inset-8 rounded-full border border-dashed border-electric-400/30 spinner" style={{ animationDuration: "14s" }} />
        <div className="absolute inset-0 rounded-full ring-conic" />
        <div className="grid h-20 w-20 place-items-center rounded-full bg-navy-900 shadow-inner shadow-black/50">
          <span className="font-display text-3xl font-bold text-gradient">94</span>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-2">
        {chips.map((c, i) => (
          <motion.span
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.14 }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold ${c.color}`}
          >
            <c.icon size={14} /> {c.label}
            <CheckCircle2 size={13} className="ml-auto opacity-70" />
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

export function LandingClient({ stats }: { stats: LandingStats }) {
  const { t } = useI18n();

  const statItems = [
    { label: t("landing.statScans"), value: stats.totalScans, icon: ScanSearch },
    { label: t("landing.statUsers"), value: stats.totalUsers, icon: Users },
    { label: t("landing.statFlagged"), value: stats.manipulated, icon: AlertTriangle },
    { label: t("landing.statTrust"), value: stats.avgTrust, icon: GaugeCircle },
  ];

  const steps = [
    { n: "01", title: t("landing.step1t"), desc: t("landing.step1d"), icon: UploadCloud },
    { n: "02", title: t("landing.step2t"), desc: t("landing.step2d"), icon: Radar },
    { n: "03", title: t("landing.step3t"), desc: t("landing.step3d"), icon: GaugeCircle },
    { n: "04", title: t("landing.step4t"), desc: t("landing.step4d"), icon: FileDown },
  ];

  const features = [
    { title: t("landing.f1t"), desc: t("landing.f1d"), icon: ImageIcon },
    { title: t("landing.f2t"), desc: t("landing.f2d"), icon: Clapperboard },
    { title: t("landing.f3t"), desc: t("landing.f3d"), icon: AudioWaveform },
    { title: t("landing.f4t"), desc: t("landing.f4d"), icon: FileText },
    { title: t("landing.f5t"), desc: t("landing.f5d"), icon: FileDown },
    { title: t("landing.f6t"), desc: t("landing.f6d"), icon: Flag },
  ];

  return (
    <div className="relative overflow-x-clip">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-45 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-electric-500/14 blur-[140px]" />
      <div className="pointer-events-none absolute left-[8%] top-[38rem] h-72 w-72 rounded-full bg-indigo-500/10 blur-[110px]" />

      {/* ============ HERO ============ */}
      <section className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-24">
        <div>
          <motion.div variants={fadeUp} initial="hide" animate="show" className="mb-5 inline-flex items-center gap-2 rounded-full border border-electric-400/25 bg-electric-500/8 px-4 py-1.5 text-[11.5px] font-semibold tracking-wide text-electric-300">
            <Sparkles size={13} aria-hidden />
            {t("landing.badge")}
          </motion.div>
          <motion.h1 variants={fadeUp} initial="hide" animate="show" transition={{ delay: 0.08 }} className="font-display text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-6xl">
            {t("landing.heroTitle1")}
            <br />
            <span className="text-gradient">{t("landing.heroTitle2")}</span>
          </motion.h1>
          <motion.p variants={fadeUp} initial="hide" animate="show" transition={{ delay: 0.16 }} className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-slate-400">
            {t("landing.heroSub")}
          </motion.p>
          <motion.div variants={fadeUp} initial="hide" animate="show" transition={{ delay: 0.24 }} className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="group flex items-center gap-2 rounded-xl bg-electric-500 px-6 py-3.5 text-[14.5px] font-semibold text-white shadow-xl shadow-electric-500/30 transition-all hover:bg-electric-400 hover:shadow-electric-400/35">
              {t("landing.ctaStart")}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/login" className="rounded-xl border border-white/12 bg-white/5 px-6 py-3.5 text-[14.5px] font-medium text-slate-200 transition-colors hover:bg-white/10">
              {t("landing.ctaLogin")}
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} initial="hide" animate="show" transition={{ delay: 0.32 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> English + हिंदी</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Files never stored</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Free for citizens</span>
          </motion.div>
        </div>
        <div className="animate-float-slow">
          <HeroConsole />
        </div>
      </section>

      {/* ============ LIVE STATS ============ */}
      <section className="relative border-y border-white/6 bg-navy-900/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {statItems.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-electric-500/12 text-electric-300">
                <s.icon size={19} aria-hidden />
              </span>
              <div>
                <p className="font-display text-2xl font-bold text-white"><Counter value={s.value} /></p>
                <p className="text-[11.5px] leading-tight text-slate-500">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ MISSION ============ */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-electric-300">{t("landing.missionKicker")}</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-[2.6rem] sm:leading-[1.15]">{t("landing.missionTitle")}</h2>
          <p className="mt-6 text-[15px] leading-relaxed text-slate-400">{t("landing.missionBody")}</p>
        </motion.div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:pb-28">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-electric-300">{t("landing.howKicker")}</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("landing.howTitle")}</h2>
        </div>
        <motion.ol initial="hide" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <motion.li key={s.n} variants={fadeUp} className="glass group relative overflow-hidden rounded-2xl p-6 transition-colors hover:border-electric-400/30">
              <span className="pointer-events-none absolute -right-2 -top-5 font-display text-[88px] font-bold leading-none text-white/4 transition-colors group-hover:text-electric-400/8">{s.n}</span>
              <span className="relative mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-electric-500/25 to-indigo-500/15 text-electric-300">
                <s.icon size={21} aria-hidden />
              </span>
              <h3 className="relative font-display text-[16px] font-semibold text-white">{s.title}</h3>
              <p className="relative mt-2 text-[13px] leading-relaxed text-slate-400">{s.desc}</p>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="relative border-t border-white/5 bg-navy-900/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-electric-300">{t("landing.featKicker")}</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("landing.featTitle")}</h2>
          </div>
          <motion.div initial="hide" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="glass group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-electric-400/30 hover:shadow-xl hover:shadow-electric-500/8">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-electric-500/12 text-electric-300 transition-transform group-hover:scale-110">
                  <f.icon size={19} aria-hidden />
                </span>
                <h3 className="font-display text-[15.5px] font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative px-4 py-20 sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="glass relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-6 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-electric-500/18 blur-[90px]" />
          <ShieldCheck size={36} className="relative mx-auto mb-5 text-electric-300" aria-hidden />
          <h2 className="relative font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{t("landing.finalCta")}</h2>
          <Link href="/signup" className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-electric-500 px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-xl shadow-electric-500/30 transition-all hover:bg-electric-400">
            {t("landing.finalCtaBtn")} <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-white/6 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-electric-400 to-electric-600 text-white"><ShieldCheck size={14} /></span>
            <span className="font-display text-[15px] font-bold text-white">Satya<span className="text-gradient">Check</span></span>
          </div>
          <p className="text-center text-[11.5px] text-slate-500">{t("landing.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
