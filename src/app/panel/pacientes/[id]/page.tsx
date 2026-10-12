import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, ClipboardList, FileText } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { PatientForm } from "@/components/patients/patient-form";
import { InvitePortalButton, ConsentToggle } from "@/components/patients/patient-actions";
import { requireStaff } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { getPatientAdmin } from "@/server/services/patients";
import { listPatientAppointments } from "@/server/services/appointments";
import { hasClinicalAccess } from "@/server/services/clinical";
import { professionalDisplayName } from "@/server/services/public-site";
import { NotFoundError } from "@/server/errors";
import { DOCUMENT_TYPE_LABELS, SEX_LABELS, USER_STATUS_LABELS } from "@/lib/labels";
import { ageFromBirthDate, formatCalendarDate, formatDateTime } from "@/lib/format";
import { dbDateToISO } from "@/lib/time";
import { updatePatientAction } from "../actions";

export const metadata = { title: "Ficha del paciente" };

export default async function PatientPage({ params, searchParams }: PageProps<"/panel/pacientes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireStaff();
  const { patient, consents } = await getPatientAdmin(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const [appointments, clinical] = await Promise.all([listPatientAppointments(actor, id), hasClinicalAccess(actor, id)]);
  const canEdit = can(actor, "pacientes.gestionar");
  const age = ageFromBirthDate(patient.birthDate);

  return (
    <div className="space-y-6">
      {sp.nuevo === "1" ? <Alert tone="success" live title="Paciente registrado">Ya puedes agendarle una cita o invitarlo al portal.</Alert> : null}
      <PageHeader
        back={{ href: "/panel/pacientes", label: "Pacientes" }}
        title={`${patient.firstName} ${patient.lastName}`}
        description={[
          patient.documentNumber ? `${DOCUMENT_TYPE_LABELS[patient.documentType]} ${patient.documentNumber}` : null,
          age !== null ? `${age} años` : null,
          patient.phone,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            {can(actor, "citas.gestionar") ? (
              <ButtonLink href={`/panel/citas/nueva?paciente=${patient.id}`} icon={<CalendarPlus className="size-4" aria-hidden="true" />}>
                Agendar cita
              </ButtonLink>
            ) : null}
            {clinical ? (
              <ButtonLink href={`/panel/pacientes/${patient.id}/historia`} variant="secondary" icon={<ClipboardList className="size-4" aria-hidden="true" />}>
                Historia clínica
              </ButtonLink>
            ) : null}
            {can(actor, "clinica.exportar") ? (
              <ButtonLink href={`/panel/pacientes/${patient.id}/exportar`} variant="ghost">
                Exportar historia
              </ButtonLink>
            ) : null}
            {clinical || can(actor, "documentos.subir") ? (
              <ButtonLink href={`/panel/pacientes/${patient.id}/documentos`} variant="outline" icon={<FileText className="size-4" aria-hidden="true" />}>
                Documentos
              </ButtonLink>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {canEdit ? (
            <PatientForm
              action={updatePatientAction}
              patientId={patient.id}
              submitLabel="Guardar cambios"
              values={{
                ...patient,
                birthDate: patient.birthDate ? dbDateToISO(patient.birthDate) : "",
              }}
            />
          ) : (
            <Card>
              <CardHeader title="Datos del paciente" />
              <CardBody>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <Row label="Fecha de nacimiento" value={patient.birthDate ? formatCalendarDate(patient.birthDate) : "—"} />
                  <Row label="Sexo" value={patient.sex ? SEX_LABELS[patient.sex] : "—"} />
                  <Row label="Teléfono" value={patient.phone ?? "—"} />
                  <Row label="Correo" value={patient.email ?? "—"} />
                  <Row label="Ciudad" value={patient.city ?? "—"} />
                  <Row label="Cobertura" value={patient.insuranceProvider ?? "—"} />
                </dl>
              </CardBody>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Acceso al portal" />
            <CardBody className="space-y-3 text-sm">
              {patient.user ? (
                <p>
                  Cuenta: <strong>{patient.user.email}</strong> <Badge tone={patient.user.status === "ACTIVE" ? "success" : "warning"}>{USER_STATUS_LABELS[patient.user.status]}</Badge>
                  {patient.user.lastLoginAt ? <span className="block text-muted">Último ingreso: {formatDateTime(patient.user.lastLoginAt)}</span> : null}
                </p>
              ) : (
                <p className="text-muted">El paciente todavía no tiene acceso al portal.</p>
              )}
              {canEdit && patient.user?.status !== "ACTIVE" ? <InvitePortalButton patientId={patient.id} hasEmail={Boolean(patient.email)} /> : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Comunicaciones" description="Consentimientos registrados (el último vigente)." />
            <CardBody className="space-y-3 text-sm">
              <ConsentRow label="Tratamiento de datos" value={consents.DATA_PROCESSING} />
              <div className="flex items-center justify-between gap-2">
                <ConsentRow label="Avisos por correo" value={consents.EMAIL_NOTIFICATIONS} />
                {canEdit ? <ConsentToggle patientId={patient.id} type="EMAIL_NOTIFICATIONS" granted={consents.EMAIL_NOTIFICATIONS !== false} /> : null}
              </div>
              <div className="flex items-center justify-between gap-2">
                <ConsentRow label="Avisos por WhatsApp" value={consents.WHATSAPP_NOTIFICATIONS} />
                {canEdit ? <ConsentToggle patientId={patient.id} type="WHATSAPP_NOTIFICATIONS" granted={consents.WHATSAPP_NOTIFICATIONS === true} /> : null}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Citas" description="Últimas 100 citas." />
            {appointments.length ? (
              <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
                {appointments.map((a) => (
                  <li key={a.id}>
                    <Link href={`/panel/citas/${a.id}`} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-primary-soft/40">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{formatDateTime(a.startsAt)}</span>
                        <span className="block truncate text-xs text-muted">
                          {a.service.name} · {professionalDisplayName(a.professional)}
                        </span>
                      </span>
                      <AppointmentStatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Sin citas registradas" className="py-8" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

function ConsentRow({ label, value }: { label: string; value: boolean | null }) {
  return (
    <p className="flex items-center gap-2">
      <span className="text-ink">{label}:</span>
      {value === null ? <Badge>Sin registro</Badge> : value ? <Badge tone="success">Autorizado</Badge> : <Badge tone="danger">No autorizado</Badge>}
    </p>
  );
}
