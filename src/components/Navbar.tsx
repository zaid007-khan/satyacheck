"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { ShieldCheck, ScanSearch, History, LayoutDashboard, LogOut, Menu, X, Languages, LogIn, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { SessionUser } from "@/lib/auth";

export function Navbar({ user }: { user: SessionUser | null }) {
  const { lang, setLang, t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("nav.landing"), icon: ShieldCheck, show: true },
    { href: "/dashboard", label: t("nav.verify"), icon: ScanSearch, show: !!user },
    { href: "/history", label: t("nav.history"), icon: History, show: !!user },
    { href: "/admin", label: t("nav.admin"), icon: LayoutDashboard, show: user?.role === "admin" },
  ].filter((l) => l.show);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    const msg = t("toast.logoutOk");
    toast("success", msg);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-navy-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="SatyaCheck home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-electric-400 to-electric-600 text-white shadow-lg shadow-electric-500/30 transition-transform group-hover:scale-105">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-700 tracking-tight text-white">
            Satya<span className="text-gradient">Check</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  active ? "bg-white/8 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <l.icon size={15} aria-hidden />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            aria-label="Switch language / भाषा बदलें"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-slate-300 transition-colors hover:border-electric-400/40 hover:text-white"
          >
            <Languages size={14} aria-hidden />
            {lang === "en" ? "हिंदी" : "EN"}
          </button>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="max-w-[160px] truncate rounded-lg bg-white/5 px-3 py-1.5 text-[12.5px] font-medium text-slate-300">
                {user.name}
                {user.role === "admin" && <span className="ml-1.5 rounded bg-electric-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-electric-300">Admin</span>}
              </span>
              <button
                onClick={logout}
                aria-label={t("nav.logout")}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-rose-400/40 hover:text-rose-300"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-300 transition-colors hover:text-white">
                <LogIn size={14} /> {t("nav.login")}
              </Link>
              <Link href="/signup" className="flex items-center gap-1.5 rounded-lg bg-electric-500 px-3.5 py-2 text-[13px] font-semibold text-white shadow-lg shadow-electric-500/25 transition-all hover:bg-electric-400 hover:shadow-electric-400/30">
                <UserPlus size={14} /> {t("nav.signup")}
              </Link>
            </div>
          )}

          <button className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/5 md:hidden"
            aria-label="Mobile"
          >
            <div className="space-y-1 px-4 py-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === l.href ? "bg-white/10 text-white" : "text-slate-400"}`}
                >
                  <l.icon size={16} /> {l.label}
                </Link>
              ))}
              {user ? (
                <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-300">
                  <LogOut size={16} /> {t("nav.logout")} ({user.name})
                </button>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link href="/login" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-center text-sm font-medium text-slate-200">
                    {t("nav.login")}
                  </Link>
                  <Link href="/signup" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-electric-500 px-3 py-2.5 text-center text-sm font-semibold text-white">
                    {t("nav.signup")}
                  </Link>
                </div>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
