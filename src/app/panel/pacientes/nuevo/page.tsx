import { PageHeader } from "@/components/panel/page-header";
import { PatientForm } from "@/components/patients/patient-form";
import { requirePermission } from "@/server/auth/current";
import { createPatientAction } from "../actions";

export const metadata = { title: "Registrar paciente" };

export default async function NewPatientPage({ searchParams }: PageProps<"/panel/pacientes/nuevo">) {
  await requirePermission("pacientes.gestionar");
  const sp = await searchParams;
  const next = sp.siguiente === "agendar" ? "agendar" : undefined;
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: "/panel/pacientes", label: "Pacientes" }}
        title="Registrar paciente"
        description="Solo los datos necesarios para identificar al paciente y comunicarse con él. Los campos con * son obligatorios."
      />
      <PatientForm action={createPatientAction} next={next} submitLabel={next ? "Registrar y agendar cita" : "Registrar paciente"} />
    </div>
  );
}
