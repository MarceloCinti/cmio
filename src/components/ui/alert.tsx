import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "error";

const styles: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  error: { box: "border-red-200 bg-red-50 text-red-900", Icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const { box, Icon } = styles[tone];
  return (
    <div
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", box, className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
