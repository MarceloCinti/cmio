import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHero({
  title,
  intro,
  crumbs = [],
  eyebrow,
}: {
  title: string;
  intro?: string;
  crumbs?: { href: string; label: string }[];
  eyebrow?: string;
}) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="container-page py-10 sm:py-14">
        <nav aria-label="Ruta de navegación">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
            <li>
              <Link href="/" className="hover:text-primary hover:underline">
                Inicio
              </Link>
            </li>
            {crumbs.map((c) => (
              <li key={c.href} className="flex items-center gap-1">
                <ChevronRight className="size-3.5" aria-hidden="true" />
                <Link href={c.href} className="hover:text-primary hover:underline">
                  {c.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1" aria-current="page">
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span className="text-ink">{title}</span>
            </li>
          </ol>
        </nav>
        {eyebrow ? <p className="mt-6 text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p> : null}
        <h1 className="mt-3 text-3xl font-bold text-ink sm:text-[2.6rem] sm:leading-tight">{title}</h1>
        {intro ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p> : null}
      </div>
    </div>
  );
}
