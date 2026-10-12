import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { AppointmentEventType, AppointmentStatus } from "@/generated/prisma/client";

type Event = {
  id: string;
  type: AppointmentEventType;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus | null;
  previousStartsAt: Date | null;
  newStartsAt: Date | null;
  reason: string | null;
  actorName: string | null;
  createdAt: Date;
};

function describe(e: Event) {
  switch (e.type) {
    case "CREATED":
      return "Cita agendada";
    case "RESCHEDULED":
      return `Reprogramada: de ${e.previousStartsAt ? formatDateTime(e.previousStartsAt) : "—"} a ${e.newStartsAt ? formatDateTime(e.newStartsAt) : "—"}`;
    case "STATUS_CHANGED":
      return `Estado: ${e.fromStatus ? APPOINTMENT_STATUS_LABELS[e.fromStatus] : "—"} → ${e.toStatus ? APPOINTMENT_STATUS_LABELS[e.toStatus] : "—"}`;
    default:
      return "Actualización";
  }
}

export function AppointmentTimeline({ events, showActor = true }: { events: Event[]; showActor?: boolean }) {
  if (!events.length) return <p className="text-sm text-muted">Sin movimientos registrados.</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-surface bg-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">{describe(e)}</p>
          <p className="text-xs text-muted">
            {formatDateTime(e.createdAt)}
            {showActor && e.actorName ? ` · ${e.actorName}` : ""}
          </p>
          {e.reason ? <p className="mt-1 text-sm text-muted">{e.reason}</p> : null}
        </li>
      ))}
    </ol>
  );
}
