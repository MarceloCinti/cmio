import { PageHeader } from "@/components/panel/page-header";
import { NotificationsList } from "@/components/account/notifications-list";
import { requireStaff } from "@/server/auth/current";
import { listNotifications } from "@/server/services/notifications";

export const metadata = { title: "Notificaciones" };

export default async function PanelNotificationsPage() {
  const actor = await requireStaff();
  const items = await listNotifications(actor, 50);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Notificaciones" description="Avisos internos. No incluyen información clínica." />
      <NotificationsList items={items} />
    </div>
  );
}
