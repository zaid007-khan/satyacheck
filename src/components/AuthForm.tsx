"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("toast.error"));
      toast("success", mode === "login" ? t("toast.loginOk") : t("toast.signupOk"));
      const next = params.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("toast.error"));
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-white/10 bg-navy-900/70 py-3 pl-11 pr-4 text-[14px] text-slate-100 placeholder-slate-600 outline-none transition-colors focus:border-electric-400/60 focus:bg-navy-900";

  return (
    <div className="relative grid min-h-[calc(100dvh-4rem)] place-items-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-electric-500/12 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass relative w-full max-w-md rounded-3xl p-8 sm:p-10">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-electric-400 to-electric-600 text-white shadow-lg shadow-electric-500/30">
            <ShieldCheck size={24} />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
          </h1>
          <p className="mt-1.5 text-[13px] text-slate-400">{t("auth.subtitle")}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.name")} autoComplete="name" required minLength={2} maxLength={80} className={inputCls} aria-label={t("auth.name")} />
            </div>
          )}
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} autoComplete="email" required className={inputCls} aria-label={t("auth.email")} />
          </div>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} className={inputCls} aria-label={t("auth.password")} />
          </div>
          {mode === "signup" && <p className="text-[11.5px] text-slate-500">{t("auth.passwordHint")}</p>}

          {error && (
            <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-2.5 text-[13px] text-rose-300">{error}</p>
          )}

          <button
            type="submit" disabled={busy}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 px-5 py-3 text-[14.5px] font-semibold text-white shadow-lg shadow-electric-500/30 transition-all hover:bg-electric-400 disabled:opacity-60"
          >
            {busy ? t("common.loading") : mode === "login" ? t("auth.loginBtn") : t("auth.signupBtn")}
            {!busy && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-slate-400">
          <Link href={mode === "login" ? "/signup" : "/login"} className="font-medium text-electric-300 underline-offset-4 transition-colors hover:text-electric-400 hover:underline">
            {mode === "login" ? t("auth.needAccount") : t("auth.haveAccount")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
