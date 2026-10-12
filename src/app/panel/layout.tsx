import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/panel-shell";
import { buildPanelNav, type NavIconName } from "@/components/panel/nav-config";
import { DemoBanner } from "@/components/demo-banner";
import { requireStaff } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { getSiteContent } from "@/server/services/settings";
import { unreadNotificationCount } from "@/server/services/notifications";
import { countOpenContactRequests } from "@/server/services/contact-requests";
import { ROLE_LABELS } from "@/lib/permissions";
import { logoutAction } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel CMIO" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireStaff();
  const [{ branding, institution }, unread, openRequests] = await Promise.all([
    getSiteContent("published"),
    unreadNotificationCount(actor),
    can(actor, "solicitudes.gestionar") ? countOpenContactRequests() : Promise.resolve(0),
  ]);
  const groups = buildPanelNav({
    role: actor.role,
    permissions: actor.permissions,
    isClinician: Boolean(actor.professionalId),
    badges: { "/panel/solicitudes": openRequests },
  });
  const all = groups.flatMap((g) => g.items);
  const priority = ["/panel", "/panel/agenda", "/panel/recepcion", "/panel/pacientes", "/panel/informes"];
  const mobileTabs = priority
    .map((href) => all.find((i) => i.href === href))
    .filter((i): i is { href: string; label: string; icon: NavIconName } => Boolean(i))
    .slice(0, 4);
  const roleLabel = actor.professionalId && actor.role !== "DOCTOR" ? `${ROLE_LABELS[actor.role]} · Profesional` : ROLE_LABELS[actor.role];

  return (
    <PanelShell
      groups={groups}
      user={{ name: actor.name, roleLabel }}
      unread={unread}
      shortName={institution.shortName}
      logoPath={branding.logoPath}
      logoAlt={branding.logoAlt}
      logoutAction={logoutAction}
      mobileTabs={mobileTabs}
      banner={<DemoBanner />}
    >
      {children}
    </PanelShell>
  );
}
