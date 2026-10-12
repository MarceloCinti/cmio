import { ConfirmAction } from "@/components/ui/confirm-action";
import { Badge } from "@/components/ui/badge";
import { EXCEPTION_KIND_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { deleteExceptionAction } from "@/actions/schedules";

type Ex = { id: string; kind: keyof typeof EXCEPTION_KIND_LABELS; title: string; startsAt: Date; endsAt: Date };

export function ExceptionList({ items, empty }: { items: Ex[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line">
      {items.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-medium text-ink">
              {e.title} <Badge tone="warning">{EXCEPTION_KIND_LABELS[e.kind]}</Badge>
            </p>
            <p className="text-sm text-muted">
              {formatDateTime(e.startsAt)} → {formatDateTime(e.endsAt)}
            </p>
          </div>
          <ConfirmAction
            action={deleteExceptionAction}
            fields={{ exceptionId: e.id }}
            title="Eliminar bloqueo"
            description={`Se eliminará «${e.title}» y esos horarios volverán a estar disponibles para reservas.`}
            confirmLabel="Eliminar"
            triggerLabel="Eliminar"
            destructive
          />
        </li>
      ))}
    </ul>
  );
}
