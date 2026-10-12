import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <ChevronLeft className="size-4" aria-hidden="true" /> {back.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold text-ink sm:text-[1.7rem]">{title}</h1>
        {description ? <div className="mt-1 text-sm text-muted sm:text-base">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
