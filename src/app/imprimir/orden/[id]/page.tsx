import { notFound } from "next/navigation";
import { PrintDocument } from "@/components/clinical/print-document";
import { requireStaff } from "@/server/auth/current";
import { getStudyOrderForPrint } from "@/server/services/print";

export const metadata = { title: "Orden de estudios" };

export default async function PrintStudyOrderPage({ params }: PageProps<"/imprimir/orden/[id]">) {
  const { id } = await params;
  const actor = await requireStaff();
  const data = await getStudyOrderForPrint(actor, id).catch(() => notFound());
  const { order } = data;
  return (
    <PrintDocument
      title="Orden de estudios"
      institution={data.institution}
      professional={{ name: data.professionalName, licenseNumber: order.professional.licenseNumber, verified: Boolean(order.professional.credentialsVerifiedAt) }}
      patient={{ name: `${order.patient.firstName} ${order.patient.lastName}`, document: order.patient.documentNumber, birthDate: order.patient.birthDate }}
      issuedAt={order.issuedAt}
      code={order.verificationCode}
      voided={order.status === "VOIDED"}
      voidReason={order.voidReason}
      verifyUrl={data.verifyUrl}
    >
      {order.isUrgent ? <p className="mb-3 font-bold uppercase">Urgente</p> : null}
      <p className="mb-2 font-semibold">Solicito:</p>
      <ul className="list-disc space-y-1 pl-6">
        {order.studies.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {order.indication ? (
        <p className="mt-6">
          <strong>Indicación:</strong> {order.indication}
        </p>
      ) : null}
    </PrintDocument>
  );
}
