import { useEffect, type ReactNode } from "react";
import { create } from "zustand";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, LockKeyhole, X } from "lucide-react";
import { cn } from "@mt/ui";
import { ESTIMATE_DISCLAIMER } from "@mt/domain";
import { useRecords } from "../../stores/records";
import { Button } from "../ui/Button";

/* ---------- toasts: short, polite status messages ---------- */

interface Toast { id: number; kind: "success" | "error" | "info"; text: string }
let nextToast = 1;
export const useToasts = create<{ toasts: Toast[]; push: (kind: Toast["kind"], text: string) => void; dismiss: (id: number) => void }>((set) => ({
  toasts: [],
  push: (kind, text) => {
    const id = nextToast++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, text }] }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
export const toast = {
  success: (t: string) => useToasts.getState().push("success", t),
  error: (t: string) => useToasts.getState().push("error", t),
  info: (t: string) => useToasts.getState().push("info", t),
};

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(t.id), t.kind === "error" ? 7000 : 3200);
    return () => window.clearTimeout(timer);
  }, [t.id, t.kind, dismiss]);
  const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Info;
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}
      className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-lift"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", t.kind === "success" ? "text-success" : t.kind === "error" ? "text-danger" : "text-info")} aria-hidden />
      <p className="t-body text-ink">{t.text}</p>
      <button type="button" aria-label="Dismiss message" onClick={() => dismiss(t.id)} className="ml-1 text-muted hover:text-ink"><X className="size-3.5" /></button>
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
      <AnimatePresence>{toasts.map((t) => <ToastItem key={t.id} t={t} />)}</AnimatePresence>
    </div>
  );
}

/* ---------- empty / loading / disclaimers ---------- */

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-10 text-center">
      <div className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent" aria-hidden>{icon}</div>
      <h3 className="t-title font-display text-ink">{title}</h3>
      {children && <p className="t-body max-w-sm leading-relaxed text-muted">{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EstimateDisclaimer({ className }: { className?: string }) {
  return <p className={cn("t-small leading-relaxed text-muted", className)}>{ESTIMATE_DISCLAIMER}</p>;
}

/** Shown while records cannot be saved durably or the vault failed to load/save. Never hides a failure. */
export function StorageBanner() {
  const { persistent, loadStatus, saveStatus, error, load, retrySave } = useRecords();
  if (loadStatus === "error") {
    return (
      <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-surface px-4 py-3">
        <AlertTriangle className="size-4 text-danger" aria-hidden />
        <p className="t-body min-w-0 flex-1 text-ink">Your records could not be opened ({error ?? "unknown error"}). Nothing has been changed or overwritten.</p>
        <Button size="sm" variant="soft" onClick={() => void load()}>Try again</Button>
      </div>
    );
  }
  if (saveStatus === "error") {
    return (
      <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-surface px-4 py-3">
        <AlertTriangle className="size-4 text-danger" aria-hidden />
        <p className="t-body min-w-0 flex-1 text-ink">Your latest changes could not be saved ({error ?? "unknown error"}). They are still on screen.</p>
        <Button size="sm" variant="soft" onClick={() => void retrySave()}>Retry saving</Button>
      </div>
    );
  }
  if (!persistent) {
    return (
      <div role="note" className="mb-5 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <LockKeyhole className="size-4 text-muted" aria-hidden />
        <p className="t-small text-muted">Preview in a browser: encrypted storage is only available in the Windows app, so entries here are not saved and disappear when you close this page.</p>
      </div>
    );
  }
  return null;
}
