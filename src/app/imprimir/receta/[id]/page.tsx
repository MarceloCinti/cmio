import { notFound } from "next/navigation";
import { PrintDocument } from "@/components/clinical/print-document";
import { requireStaff } from "@/server/auth/current";
import { getPrescriptionForPrint } from "@/server/services/print";

export const metadata = { title: "Receta" };

export default async function PrintPrescriptionPage({ params }: PageProps<"/imprimir/receta/[id]">) {
  const { id } = await params;
  const actor = await requireStaff();
  const data = await getPrescriptionForPrint(actor, id).catch(() => notFound());
  const { rx } = data;
  return (
    <PrintDocument
      title="Receta"
      institution={data.institution}
      professional={{ name: data.professionalName, licenseNumber: rx.professional.licenseNumber, verified: Boolean(rx.professional.credentialsVerifiedAt) }}
      patient={{ name: `${rx.patient.firstName} ${rx.patient.lastName}`, document: rx.patient.documentNumber, birthDate: rx.patient.birthDate }}
      issuedAt={rx.issuedAt}
      code={rx.verificationCode}
      voided={rx.status === "VOIDED"}
      voidReason={rx.voidReason}
      verifyUrl={data.verifyUrl}
    >
      <p className="mb-3 text-[14pt] font-bold">Rp/</p>
      <ol className="space-y-4">
        {rx.items.map((it, i) => (
          <li key={it.id}>
            <p className="font-semibold">
              {i + 1}. {it.medication}
              {it.quantity ? ` — Cantidad: ${it.quantity}` : ""}
            </p>
            <p>{[it.dose, it.frequency, it.duration].filter(Boolean).join(" · ")}</p>
            {it.instructions ? <p className="italic">{it.instructions}</p> : null}
          </li>
        ))}
      </ol>
      {rx.notes ? <p className="mt-6 border-t border-dashed border-black pt-3">{rx.notes}</p> : null}
    </PrintDocument>
  );
}
