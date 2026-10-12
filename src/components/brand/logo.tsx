import Image from "next/image";
import { cn } from "@/lib/cn";

/** Isotipo de CMIO: una "C" abierta que contiene una hoja (cuidado integral y bienestar). */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect width="40" height="40" rx="11" fill="var(--brand-primary)" />
      <path d="M28.2 13.2a10.2 10.2 0 1 0 0 13.6" stroke="#fff" strokeWidth="3.3" fill="none" strokeLinecap="round" />
      <path
        d="M19.6 26.4c-.3-5.6 2.6-9.6 8.3-10.6.2 5.7-2.9 9.5-8.3 10.6Z"
        fill="color-mix(in oklab, var(--brand-wellness) 45%, white)"
      />
      <path d="M19.9 26.1c1.7-2.6 3.8-4.8 6.3-6.6" stroke="var(--brand-primary)" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({
  logoPath,
  logoAlt,
  shortName = "CMIO",
  subtitle,
  className,
  compact,
}: {
  logoPath?: string | null;
  logoAlt?: string;
  shortName?: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
}) {
  if (logoPath) {
    return (
      <span className={cn("flex items-center", className)}>
        <Image src={logoPath} alt={logoAlt ?? shortName} width={160} height={48} className="h-10 w-auto object-contain" priority />
      </span>
    );
  }
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-extrabold tracking-tight text-ink">{shortName}</span>
        {!compact && subtitle ? (
          <span className="mt-0.5 hidden text-[0.68rem] font-medium tracking-wide text-muted sm:block">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}
