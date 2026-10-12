import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/portal-shell";
import { DemoBanner } from "@/components/demo-banner";
import { requirePatient } from "@/server/auth/current";
import { getSiteContent } from "@/server/services/settings";
import { unreadNotificationCount } from "@/server/services/notifications";
import { db } from "@/server/db";
import { logoutAction } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: { default: "Portal del paciente", template: "%s · Portal del paciente" }, robots: { index: false, follow: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePatient();
  const [{ branding, institution }, unread, patient] = await Promise.all([
    getSiteContent("published"),
    unreadNotificationCount(actor),
    db.patient.findUnique({ where: { id: actor.patientId }, select: { portalProgressEnabled: true } }),
  ]);
  return (
    <PortalShell
      name={actor.name}
      unread={unread}
      showProgress={Boolean(patient?.portalProgressEnabled)}
      shortName={institution.shortName}
      logoPath={branding.logoPath}
      logoAlt={branding.logoAlt}
      logoutAction={logoutAction}
      banner={<DemoBanner />}
    >
      {children}
    </PortalShell>
  );
}
