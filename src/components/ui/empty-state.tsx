import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {icon ? (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</div>
      ) : null}
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <div className="mt-1 max-w-md text-sm text-muted">{description}</div> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
