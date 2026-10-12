"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  CalendarOff,
  ClipboardList,
  Clock,
  ConciergeBell,
  FileText,
  Globe,
  HelpCircle,
  Home,
  Inbox,
  Layers,
  LogOut,
  Menu,
  Plus,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import type { NavGroup, NavIconName } from "./nav-config";

const ICONS: Record<NavIconName, typeof Home> = {
  home: Home,
  calendar: CalendarDays,
  reception: ConciergeBell,
  plus: Plus,
  inbox: Inbox,
  users: Users,
  clock: Clock,
  stethoscope: Stethoscope,
  layers: Layers,
  briefcase: Briefcase,
  holiday: CalendarOff,
  "user-cog": UserCog,
  shield: ShieldCheck,
  globe: Globe,
  help: HelpCircle,
  settings: Settings,
  send: Send,
  chart: BarChart3,
  audit: ScrollText,
  account: UserRound,
  bell: Bell,
  file: FileText,
};

type Props = {
  groups: NavGroup[];
  user: { name: string; roleLabel: string };
  unread: number;
  shortName: string;
  logoPath: string | null;
  logoAlt: string;
  logoutAction: () => Promise<void>;
  mobileTabs: { href: string; label: string; icon: NavIconName }[];
  children: ReactNode;
  banner?: ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === "/panel") return pathname === "/panel";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Menú del panel" className="space-y-6">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title ? <p className="mb-2 px-3 text-[0.7rem] font-semibold tracking-wider text-muted uppercase">{g.title}</p> : null}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-primary text-white" : "text-ink/80 hover:bg-primary-soft hover:text-primary",
                    )}
                  >
                    <Icon className="size-[1.1rem] shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          active ? "bg-white/20 text-white" : "bg-accent text-white",
                        )}
                      >
                        {item.badge}
                        <span className="sr-only"> pendientes</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function PanelShell({ groups, user, unread, shortName, logoPath, logoAlt, logoutAction, mobileTabs, children, banner }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Cierra el menú al navegar (ajuste de estado durante el render, sin efecto).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const userBlock = (
    <div className="border-t border-line p-3">
      <Link href="/panel/cuenta" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-primary-soft">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary" aria-hidden="true">
          {user.name
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.roleLabel}</span>
        </span>
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink/80 hover:bg-red-50 hover:text-red-700">
          <LogOut className="size-[1.1rem]" aria-hidden="true" /> Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Barra lateral de escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/panel" aria-label="Inicio del panel">
            <Logo logoPath={logoPath} logoAlt={logoAlt} shortName={shortName} compact />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <NavList groups={groups} pathname={pathname} />
        </div>
        {userBlock}
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-5 lg:ml-64 lg:h-16">
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap-target inline-flex items-center justify-center rounded-lg text-ink hover:bg-primary-soft"
            aria-label="Abrir menú"
            aria-expanded={open}
            aria-controls="panel-menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Link href="/panel" aria-label="Inicio del panel">
            <Logo logoPath={logoPath} logoAlt={logoAlt} shortName={shortName} compact />
          </Link>
        </div>
        <div className="hidden text-sm text-muted lg:block">
          {shortName} · Panel de gestión
        </div>
        <div className="flex items-center gap-1">
          <Link href="/panel/notificaciones" className="relative tap-target inline-flex items-center justify-center rounded-lg text-ink hover:bg-primary-soft" aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ""}`}>
            <Bell className="size-5" aria-hidden="true" />
            {unread ? (
              <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-white" aria-hidden="true">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
          <Link href="/panel/cuenta" className="tap-target hidden items-center justify-center rounded-lg text-ink hover:bg-primary-soft sm:inline-flex lg:hidden" aria-label="Mi cuenta">
            <UserRound className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* Menú móvil */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel" id="panel-menu">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-surface shadow-lift">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo logoPath={logoPath} logoAlt={logoAlt} shortName={shortName} compact />
              <button type="button" onClick={() => setOpen(false)} className="tap-target inline-flex items-center justify-center rounded-lg" aria-label="Cerrar menú">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <NavList groups={groups} pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            {userBlock}
          </div>
        </div>
      ) : null}

      <main id="contenido" className="pb-24 lg:ml-64 lg:pb-10">
        {banner}
        <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 lg:px-8 lg:py-8">{children}</div>
      </main>

      {/* Navegación inferior en celulares */}
      <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${mobileTabs.length + 1}, minmax(0, 1fr))` }}>
          {mobileTabs.map((t) => {
            const Icon = ICONS[t.icon];
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium", active ? "text-primary" : "text-muted")}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {t.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setOpen(true)} className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium text-muted">
              <ClipboardList className="size-5" aria-hidden="true" />
              Más
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
