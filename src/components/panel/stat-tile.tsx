import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function StatTile({ label, value, hint, href, icon }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; icon?: ReactNode }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon ? <span className="text-primary">{icon}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5";
  return href ? (
    <Link href={href} className={cn(cls, "transition-shadow hover:shadow-lift")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
