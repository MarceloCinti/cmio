import { Badge } from "@/components/ui/badge";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONES, type AppointmentStatusKey } from "@/lib/labels";

export function AppointmentStatusBadge({ status }: { status: AppointmentStatusKey }) {
  return <Badge tone={APPOINTMENT_STATUS_TONES[status]}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>;
}
