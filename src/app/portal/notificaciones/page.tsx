import { NotificationsList } from "@/components/account/notifications-list";
import { requirePatient } from "@/server/auth/current";
import { listNotifications } from "@/server/services/notifications";

export const metadata = { title: "Notificaciones" };

export default async function PortalNotificationsPage() {
  const actor = await requirePatient();
  const items = await listNotifications(actor, 50);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Notificaciones</h1>
      <NotificationsList items={items} />
    </div>
  );
}
