import Link from "next/link";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/confirm-action";
import { formatDateTime } from "@/lib/format";
import { markAllReadAction, markReadAction } from "@/actions/account";

type N = { id: string; title: string; body: string; href: string | null; readAt: Date | null; createdAt: Date };

export function NotificationsList({ items }: { items: N[] }) {
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="space-y-4">
      {unread ? (
        <ActionButton action={markAllReadAction} variant="outline">
          Marcar todas como leídas ({unread})
        </ActionButton>
      ) : null}
      <Card>
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className="flex items-start gap-3 px-5 py-4">
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.readAt ? "bg-line" : "bg-accent"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {n.title}
                    {!n.readAt ? <span className="sr-only"> (sin leer)</span> : null}
                  </p>
                  <p className="text-sm text-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {n.href ? (
                      <Link href={n.href} className="font-semibold text-primary hover:underline">
                        Ver
                      </Link>
                    ) : null}
                    {!n.readAt ? (
                      <ActionButton action={markReadAction} fields={{ id: n.id }} variant="ghost" size="sm">
                        Marcar como leída
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Bell className="size-6" aria-hidden="true" />} title="No tienes notificaciones" />
        )}
      </Card>
    </div>
  );
}
