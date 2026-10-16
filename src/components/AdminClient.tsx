"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, ScanSearch, Users, Flag, Gauge, Image as ImageIcon,
  Clapperboard, AudioWaveform, FileText, CheckCircle2, RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";

type Stats = {
  totals: { totalScans: number; avgTrust: number; manipulated: number };
  totalUsers: number;
  openReports: number;
  byType: { type: string; count: number }[];
  verdicts: { verdict: string; count: number }[];
  byDay: { day: string; count: number }[];
  recent: { id: string; type: string; target: string; trustScore: number; verdict: string; createdAt: string; userName: string; userEmail: string }[];
};

type Report = {
  id: string; reason: string; notes: string; contentSummary: string; status: string;
  scanType: string; createdAt: string; userName: string; userEmail: string;
};

const TYPE_COLORS: Record<string, string> = { image: "#38bdf8", video: "#818cf8", audio: "#34d399", text: "#fbbf24" };
const VERDICT_COLORS: Record<string, string> = { authentic: "#34d399", uncertain: "#fbbf24", manipulated: "#fb7185" };
const TYPE_ICON: Record<string, React.ElementType> = { image: ImageIcon, video: Clapperboard, audio: AudioWaveform, text: FileText };

const tooltipStyle = {
  contentStyle: { background: "#0d1633", border: "1px solid rgba(125,211,252,.2)", borderRadius: 12, fontSize: 12, color: "#e2e8f0" },
  labelStyle: { color: "#94a3b8" },
};

export function AdminClient() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats).catch(() => toast("error", t("toast.error")));
    fetch("/api/admin/reports").then((r) => r.json()).then((d) => setReports(d.reports ?? [])).catch(() => {});
  }, [toast, t]);

  async function toggleReport(id: string, status: string) {
    const next = status === "open" ? "resolved" : "open";
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status: next } : r)));
    toast("success", next === "resolved" ? t("admin.resolved") : t("admin.open"));
  }

  const volume = useMemo(() => {
    if (!stats) return [];
    const map = new Map(stats.byDay.map((d) => [d.day, d.count]));
    const out: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key.slice(5), count: map.get(key) ?? 0 });
    }
    return out;
  }, [stats]);

  if (!stats) {
    return <div className="mx-auto max-w-7xl px-6 pt-16 text-slate-500">{t("common.loading")}</div>;
  }

  const cards = [
    { label: t("admin.totalScans"), value: stats.totals.totalScans, icon: ScanSearch, accent: "text-electric-300 bg-electric-500/12" },
    { label: t("admin.users"), value: stats.totalUsers, icon: Users, accent: "text-indigo-300 bg-indigo-500/12" },
    { label: t("admin.openReports"), value: stats.openReports, icon: Flag, accent: "text-rose-300 bg-rose-500/12" },
    { label: t("admin.avgTrust"), value: stats.totals.avgTrust, icon: Gauge, accent: "text-emerald-300 bg-emerald-500/12" },
  ];

  const th = "px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-slate-500";
  const td = "px-4 py-3 text-[12.5px] text-slate-300";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-electric-300">
          <LayoutDashboard size={17} />
          <span className="text-[11px] font-bold uppercase tracking-[0.24em]">Trust Command Center</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("admin.title")}</h1>
        <p className="mt-1.5 text-[14px] text-slate-400">{t("admin.subtitle")}</p>
      </motion.header>

      {/* stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass rounded-2xl p-5">
            <span className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${c.accent}`}><c.icon size={18} /></span>
            <p className="font-display text-3xl font-bold text-white">{c.value}</p>
            <p className="mt-0.5 text-[12px] text-slate-400">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="mb-4 font-display text-[14px] font-semibold text-slate-200">{t("admin.volume")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volume} margin={{ left: -22, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2e7dff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#2e7dff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2.2} fill="url(#vol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="glass rounded-2xl p-5">
          <h3 className="mb-2 font-display text-[14px] font-semibold text-slate-200">{t("admin.typeDist")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.byType} dataKey="count" nameKey="type" innerRadius={52} outerRadius={78} paddingAngle={4} strokeWidth={0}>
                  {stats.byType.map((d) => <Cell key={d.type} fill={TYPE_COLORS[d.type] ?? "#38bdf8"} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconSize={9} formatter={(v: string) => <span className="text-[11.5px] capitalize text-slate-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5">
          <h3 className="mb-2 font-display text-[14px] font-semibold text-slate-200">{t("admin.verdictDist")}</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.verdicts} margin={{ left: -22, right: 8, top: 8 }}>
                <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
                <XAxis dataKey="verdict" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(56,189,248,.06)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.verdicts.map((d) => <Cell key={d.verdict} fill={VERDICT_COLORS[d.verdict] ?? "#38bdf8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* recent scans */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="glass overflow-hidden rounded-2xl lg:col-span-2">
          <h3 className="px-5 pt-5 font-display text-[14px] font-semibold text-slate-200">{t("admin.recent")}</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-white/6 bg-navy-950/40">
                <tr>
                  <th className={th}>{t("history.type")}</th>
                  <th className={th}>{t("admin.user")}</th>
                  <th className={th}>{t("admin.target")}</th>
                  <th className={th}>{t("admin.score")}</th>
                  <th className={th}>{t("admin.verdict")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((r) => {
                  const Icon = TYPE_ICON[r.type] ?? FileText;
                  return (
                    <tr key={r.id} className="border-b border-white/4 transition-colors hover:bg-white/3">
                      <td className={td}><span className="flex items-center gap-1.5 capitalize"><Icon size={13} className="text-electric-300" />{r.type}</span></td>
                      <td className={td}><span className="block max-w-[140px] truncate">{r.userName}</span></td>
                      <td className={td}><span className="block max-w-[180px] truncate" title={r.target}>{r.target}</span></td>
                      <td className={td}>
                        <span className="font-display font-bold" style={{ color: r.trustScore >= 70 ? "#34d399" : r.trustScore >= 40 ? "#fbbf24" : "#fb7185" }}>{r.trustScore}</span>
                      </td>
                      <td className={td}>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: VERDICT_COLORS[r.verdict], borderColor: `${VERDICT_COLORS[r.verdict]}44`, background: `${VERDICT_COLORS[r.verdict]}14` }}>
                          {t(`result.${r.verdict}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* reports */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="glass overflow-hidden rounded-2xl">
        <h3 className="flex items-center gap-2 px-5 pt-5 font-display text-[14px] font-semibold text-slate-200">
          <Flag size={14} className="text-rose-300" /> {t("admin.reports")}
        </h3>
        {reports.length === 0 ? (
          <p className="p-6 text-[13px] text-slate-500">{t("admin.emptyReports")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto pb-2">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-white/6 bg-navy-950/40">
                <tr>
                  <th className={th}>{t("admin.reason")}</th>
                  <th className={th}>{t("admin.target")}</th>
                  <th className={th}>{t("admin.user")}</th>
                  <th className={th}>{t("admin.when")}</th>
                  <th className={th}>{t("admin.status")}</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-white/4 transition-colors hover:bg-white/3">
                    <td className={td}><span className="block max-w-[190px] truncate font-medium">{t(`report.${r.reason}`)}</span></td>
                    <td className={td}><span className="block max-w-[220px] truncate text-slate-400" title={r.contentSummary + (r.notes ? ` — ${r.notes}` : "")}>{r.contentSummary || "—"}</span></td>
                    <td className={td}><span className="block max-w-[150px] truncate">{r.userName}</span></td>
                    <td className={td}>{new Date(r.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
                    <td className={td}>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${r.status === "open" ? "border-amber-400/30 bg-amber-500/10 text-amber-300" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"}`}>
                        {r.status === "open" ? t("admin.open") : t("admin.resolved")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleReport(r.id, r.status)}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
                      >
                        {r.status === "open" ? <><CheckCircle2 size={12} /> {t("admin.resolve")}</> : <><RotateCcw size={12} /> {t("admin.reopen")}</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
