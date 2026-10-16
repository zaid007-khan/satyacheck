"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

function colorFor(score: number): string {
  if (score >= 70) return "#34d399";
  if (score >= 40) return "#fbbf24";
  return "#fb7185";
}

export function TrustGauge({ score, size = 220, label }: { score: number; size?: number; label?: string }) {
  const spring = useSpring(0, { stiffness: 42, damping: 16 });
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    spring.set(score);
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return () => { unsub(); cancelAnimationFrame(raf.current); };
  }, [score, spring]);

  const R = size / 2 - 16;
  const CIRC = Math.PI * R; // 180° arc length
  const dash = useTransform(spring, (v) => (CIRC * v) / 100);
  const [dashVal, setDashVal] = useState(0);
  useEffect(() => {
    const unsub = dash.on("change", (v) => setDashVal(v));
    return unsub;
  }, [dash]);

  const c = colorFor(score);
  const id = useRef(`g${Math.random().toString(36).slice(2, 8)}`).current;

  return (
    <div className="relative flex flex-col items-center" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Trust score"}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c} stopOpacity="0.55" />
            <stop offset="100%" stopColor={c} />
          </linearGradient>
        </defs>
        <path
          d={`M 16 ${size * 0.6} A ${R} ${R} 0 0 1 ${size - 16} ${size * 0.6}`}
          fill="none" className="gauge-track" strokeWidth="13" strokeLinecap="round"
        />
        <motion.path
          d={`M 16 ${size * 0.6} A ${R} ${R} 0 0 1 ${size - 16} ${size * 0.6}`}
          fill="none" stroke={`url(#${id})`} strokeWidth="13" strokeLinecap="round"
          strokeDasharray={`${dashVal} ${CIRC + 1}`}
          style={{ filter: `drop-shadow(0 0 10px ${c}66)` }}
        />
        {/* tick marks */}
        {[0, 25, 50, 75, 100].map((t) => {
          const ang = Math.PI + (Math.PI * t) / 100;
          const x1 = size / 2 + (R - 16) * Math.cos(ang), y1 = size * 0.6 + (R - 16) * Math.sin(ang);
          const x2 = size / 2 + (R - 24) * Math.cos(ang), y2 = size * 0.6 + (R - 24) * Math.sin(ang);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(148,163,184,.35)" strokeWidth="2" />;
        })}
      </svg>
      <div className="absolute inset-x-0 top-[38%] flex flex-col items-center">
        <span className="font-display text-5xl font-bold tracking-tight" style={{ color: c, textShadow: `0 0 24px ${c}55` }}>
          {display}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label ?? "Trust score"}</span>
      </div>
    </div>
  );
}
