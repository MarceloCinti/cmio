import Image from "next/image";
import { cn } from "@/lib/cn";

/** Isotipo del CMIO (figura y trazo del logotipo oficial). */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <Image
      src="/images/marca/cmio-marca.png"
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      width={117}
      height={210}
      className={cn("h-9 w-auto shrink-0", className)}
    />
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
        <Image src={logoPath} alt={logoAlt ?? shortName} width={409} height={211} className="h-10 w-auto object-contain sm:h-11" priority />
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
