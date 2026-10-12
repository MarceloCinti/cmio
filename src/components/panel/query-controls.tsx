"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { inputClasses } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";

/** Selector que actualiza un parámetro de la URL (filtros de listados). */
export function QuerySelect({
  name,
  label,
  options,
  value,
  allLabel,
  className,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  allLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-sm", className)}>
      <span className="flex items-center gap-2 font-medium text-ink">
        {label} {pending ? <Spinner className="size-3.5" /> : null}
      </span>
      <select
        className={cn(inputClasses, "min-h-10 py-2")}
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set(name, e.target.value);
          else next.delete(name);
          next.delete("pagina");
          start(() => router.push(`${pathname}?${next.toString()}`));
        }}
      >
        {allLabel !== undefined ? <option value="">{allLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SegmentedLinks({ items, current, label }: { items: { value: string; label: string; href: string }[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-xl border border-line bg-surface p-1">
      {items.map((i) => (
        <Link
          key={i.value}
          href={i.href}
          aria-current={i.value === current ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            i.value === current ? "bg-primary text-white" : "text-ink/80 hover:bg-primary-soft hover:text-primary",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
