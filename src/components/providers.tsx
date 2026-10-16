"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { LanguageProvider } from "@/lib/i18n";

export type ToastKind = "success" | "error" | "info" | "warn";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastCtx = createContext<{ toast: (kind: ToastKind, message: string) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />,
  error: <XCircle size={17} className="text-rose-400 shrink-0" />,
  warn: <AlertTriangle size={17} className="text-amber-400 shrink-0" />,
  info: <Info size={17} className="text-sky-400 shrink-0" />,
};

function Toaster({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto flex items-center gap-2.5 max-w-sm rounded-xl border border-white/10 bg-[#0d1633]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            {ICONS[t.kind]}
            <span className="text-[13px] text-slate-200 leading-snug">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="ml-1 text-slate-500 hover:text-slate-300 transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  return (
    <LanguageProvider>
      <ToastCtx.Provider value={{ toast }}>
        {children}
        <Toaster toasts={toasts} dismiss={dismiss} />
      </ToastCtx.Provider>
    </LanguageProvider>
  );
}
