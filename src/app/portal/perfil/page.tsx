import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ProfileForms } from "@/components/portal/profile-forms";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { requirePatient } from "@/server/auth/current";
import { getMyPatient } from "@/server/services/patients";
import { DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { formatCalendarDate } from "@/lib/format";

export const metadata = { title: "Mi perfil" };

export default async function MyProfilePage() {
  const actor = await requirePatient();
  const { patient, consents } = await getMyPatient(actor);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Mi perfil</h1>
        <p className="mt-1 text-muted">Consulta y actualiza tus datos de contacto y tus preferencias de comunicación.</p>
      </div>
      <Card>
        <CardHeader title="Datos de identificación" description="Para corregir estos datos, comunícate con la secretaría." />
        <CardBody>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Nombre</dt>
              <dd className="font-medium text-ink">
                {patient.firstName} {patient.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Documento</dt>
              <dd className="font-medium text-ink">{patient.documentNumber ? `${DOCUMENT_TYPE_LABELS[patient.documentType]} ${patient.documentNumber}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Fecha de nacimiento</dt>
              <dd className="font-medium text-ink">{patient.birthDate ? formatCalendarDate(patient.birthDate) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Correo de la cuenta</dt>
              <dd className="font-medium text-ink">{actor.email}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>
      <ProfileForms
        values={{
          phone: patient.phone ?? "",
          city: patient.city ?? "",
          address: patient.address ?? "",
          emergencyContactName: patient.emergencyContactName ?? "",
          emergencyContactPhone: patient.emergencyContactPhone ?? "",
          insuranceProvider: patient.insuranceProvider ?? "",
        }}
        emailOptIn={consents.EMAIL_NOTIFICATIONS !== false}
        whatsappOptIn={consents.WHATSAPP_NOTIFICATIONS === true}
      />
      <Card>
        <CardHeader title="Cambiar contraseña" description="Al cambiarla se cerrarán tus sesiones en otros dispositivos." />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
