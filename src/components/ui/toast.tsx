"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, X, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Toast = { id: number; tone: "success" | "error" | "info"; message: string };
type ToastFn = (message: string, tone?: Toast["tone"]) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<ToastFn>((message, tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tone, message }]);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.tone === "error" ? 9000 : 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);
  const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? XCircle : Info;
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-sm shadow-lift",
        toast.tone === "success" && "border-emerald-200",
        toast.tone === "error" && "border-red-200",
        toast.tone === "info" && "border-sky-200",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          toast.tone === "success" && "text-emerald-600",
          toast.tone === "error" && "text-red-600",
          toast.tone === "info" && "text-sky-600",
        )}
        aria-hidden="true"
      />
      <p className="flex-1 text-ink">{toast.message}</p>
      <button type="button" onClick={onDismiss} className="-m-1 rounded p-1 text-muted hover:text-ink" aria-label="Cerrar aviso">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
