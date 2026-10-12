"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarPlus, Menu, MessageCircle, Phone, UserRound, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const SITE_NAV = [
  { href: "/", label: "Inicio" },
  { href: "/la-clinica", label: "La clínica" },
  { href: "/especialidades", label: "Especialidades" },
  { href: "/profesionales", label: "Profesionales" },
  { href: "/servicios", label: "Servicios" },
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { href: "/contacto", label: "Contacto" },
];

type Props = {
  shortName: string;
  subtitle: string;
  logoPath: string | null;
  logoAlt: string;
  phoneHref: string | null;
  phoneLabel: string | null;
  whatsappHref: string | null;
  portalHref: string;
  portalLabel: string;
};

export function SiteHeader({ shortName, subtitle, logoPath, logoAlt, phoneHref, phoneLabel, whatsappHref, portalHref, portalLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled || open ? "border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85" : "border-transparent bg-canvas/80",
      )}
    >
      <div className="container-page flex h-16 max-w-[84rem] items-center justify-between gap-3 lg:h-[4.5rem]">
        <Link href="/" className="rounded-lg" aria-label={`${shortName}, ir al inicio`}>
          <Logo logoPath={logoPath} logoAlt={logoAlt} shortName={shortName} subtitle={subtitle} compact />
        </Link>

        <nav aria-label="Navegación principal" className="hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {SITE_NAV.filter((item) => item.href !== "/").map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-2.5 py-2 text-[0.92rem] font-medium whitespace-nowrap text-ink/80 transition-colors hover:bg-primary-soft hover:text-primary",
                    isActive(item.href) && "text-primary",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href={portalHref} variant="ghost" size="md" className="hidden md:inline-flex" icon={<UserRound className="size-4" aria-hidden="true" />}>
            {portalLabel}
          </ButtonLink>
          <ButtonLink href="/solicitar-cita" variant="primary" size="md" className="hidden sm:inline-flex" icon={<CalendarPlus className="size-4" aria-hidden="true" />}>
            Solicitar una cita
          </ButtonLink>
          <button
            type="button"
            className="tap-target inline-flex items-center justify-center rounded-xl border border-line bg-surface text-ink xl:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          </button>
        </div>
      </div>

      {open ? (
        <div id="menu-movil" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-white xl:hidden">
          <nav aria-label="Menú" className="container-page py-4">
            <ul className="divide-y divide-line">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-13 items-center py-3 text-lg font-medium text-ink",
                      isActive(item.href) && "text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3">
              <ButtonLink href="/solicitar-cita" size="lg" icon={<CalendarPlus className="size-5" aria-hidden="true" />}>
                Solicitar una cita
              </ButtonLink>
              <ButtonLink href={portalHref} variant="outline" size="lg" icon={<UserRound className="size-5" aria-hidden="true" />}>
                {portalLabel}
              </ButtonLink>
              <div className="grid grid-cols-2 gap-3">
                {phoneHref ? (
                  <a href={phoneHref} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-soft px-3 font-semibold text-primary">
                    <Phone className="size-5" aria-hidden="true" />
                    Llamar
                    {phoneLabel ? <span className="sr-only"> al {phoneLabel}</span> : null}
                  </a>
                ) : null}
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-wellness-soft px-3 font-semibold text-ink"
                  >
                    <MessageCircle className="size-5" aria-hidden="true" />
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
