"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, CalendarDays, CalendarPlus, FileText, Home, LineChart, LogOut, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  name: string;
  unread: number;
  showProgress: boolean;
  shortName: string;
  logoPath: string | null;
  logoAlt: string;
  logoutAction: () => Promise<void>;
  banner?: ReactNode;
};

export function PortalShell({ children, name, unread, showProgress, shortName, logoPath, logoAlt, logoutAction, banner }: Props) {
  const pathname = usePathname();
  const items = [
    { href: "/portal", label: "Inicio", icon: Home },
    { href: "/portal/citas", label: "Mis citas", icon: CalendarDays },
    { href: "/portal/documentos", label: "Documentos", icon: FileText },
    ...(showProgress ? [{ href: "/portal/seguimiento", label: "Seguimiento", icon: LineChart }] : []),
    { href: "/portal/perfil", label: "Mi perfil", icon: UserRound },
  ];
  const active = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {banner}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16">
          <Link href="/portal" aria-label="Inicio del portal">
            <Logo logoPath={logoPath} logoAlt={logoAlt} shortName={shortName} compact />
          </Link>
          <nav aria-label="Portal del paciente" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={active(i.href) ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium",
                      active(i.href) ? "bg-primary-soft text-primary" : "text-ink/80 hover:bg-primary-soft hover:text-primary",
                    )}
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <Link
              href="/portal/notificaciones"
              className="relative tap-target inline-flex items-center justify-center rounded-lg hover:bg-primary-soft"
              aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ""}`}
            >
              <Bell className="size-5" aria-hidden="true" />
              {unread ? (
                <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-white" aria-hidden="true">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="tap-target inline-flex items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-ink/80 hover:bg-red-50 hover:text-red-700">
                <LogOut className="size-5" aria-hidden="true" />
                <span className="hidden sm:inline">Salir</span>
                <span className="sr-only sm:hidden">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 sm:py-8 md:pb-10">
        <p className="sr-only">Sesión iniciada como {name}</p>
        {children}
      </main>
      <nav aria-label="Accesos del portal" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {items.slice(0, 2).map((i) => (
            <TabItem key={i.href} {...i} active={active(i.href)} />
          ))}
          <li className="flex items-start justify-center">
            <Link
              href="/portal/citas/nueva"
              className="-mt-5 flex size-14 flex-col items-center justify-center rounded-2xl bg-accent text-white shadow-lift"
              aria-label="Agendar una cita"
            >
              <CalendarPlus className="size-6" aria-hidden="true" />
            </Link>
          </li>
          {items
            .filter((i) => i.href === "/portal/documentos" || i.href === "/portal/perfil")
            .map((i) => (
              <TabItem key={i.href} {...i} active={active(i.href)} />
            ))}
        </ul>
      </nav>
    </div>
  );
}

function TabItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium", active ? "text-primary" : "text-muted")}
      >
        <Icon className="size-5" aria-hidden="true" />
        {label}
      </Link>
    </li>
  );
}
