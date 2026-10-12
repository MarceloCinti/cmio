"use client";

import { useState, useTransition, type ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import { useRouter } from "next/navigation";
import type { ActionState, FormAction } from "@/lib/action-state";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { inputClasses } from "./form";
import { useToast } from "./toast";

type Props = {
  action: FormAction;
  fields?: Record<string, string>;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  triggerLabel: ReactNode;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: ReactNode;
  triggerClassName?: string;
  destructive?: boolean;
  /** Pide un motivo obligatorio (se envía como "reason"). */
  reasonLabel?: string;
  reasonRequired?: boolean;
  onDone?: (state: ActionState) => void;
};

/** Botón que pide confirmación antes de ejecutar una acción (obligatorio en acciones destructivas). */
export function ConfirmAction({
  action,
  fields = {},
  title,
  description,
  confirmLabel,
  cancelLabel = "Volver",
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerIcon,
  triggerClassName,
  destructive,
  reasonLabel,
  reasonRequired,
  onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function confirm() {
    if (reasonLabel && reasonRequired && reason.trim().length < 3) {
      setError("Indica el motivo (al menos 3 caracteres).");
      return;
    }
    setError(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    if (reasonLabel) fd.set("reason", reason.trim());
    startTransition(async () => {
      const result = await action(null, fd);
      if (result?.ok) {
        setOpen(false);
        setReason("");
        if (result.message) toast(result.message, "success");
        router.refresh();
      } else if (result) {
        setError(result.message);
      }
      onDone?.(result);
    });
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => (!pending ? setOpen(o) : null)}>
      <AlertDialog.Trigger asChild>
        <Button variant={triggerVariant} size={triggerSize} icon={triggerIcon} className={triggerClassName}>
          {triggerLabel}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px]" />
        <AlertDialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-lift sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6">
          <AlertDialog.Title className="text-lg font-semibold text-ink">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm leading-relaxed text-muted">{description}</div>
          </AlertDialog.Description>
          {reasonLabel ? (
            <div className="mt-4 space-y-1.5">
              <label htmlFor="confirm-reason" className="block text-sm font-medium text-ink">
                {reasonLabel}
                {reasonRequired ? <span className="text-red-700"> *</span> : <span className="text-muted"> (opcional)</span>}
              </label>
              <textarea
                id="confirm-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className={inputClasses}
              />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={pending}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button variant={destructive ? "danger" : "secondary"} onClick={confirm} loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Ejecuta una acción simple (sin confirmación) desde un botón, con aviso del resultado. */
export function ActionButton({
  action,
  fields = {},
  children,
  variant = "outline",
  size = "sm",
  icon,
  className,
}: {
  action: FormAction;
  fields?: Record<string, string>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      variant={variant}
      size={size}
      icon={icon}
      className={className}
      loading={pending}
      onClick={() => {
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) fd.set(k, v);
        startTransition(async () => {
          const result = await action(null, fd);
          if (result?.ok) {
            if (result.message) toast(result.message, "success");
            router.refresh();
          } else if (result) toast(result.message, "error");
        });
      }}
    >
      {children}
    </Button>
  );
}
