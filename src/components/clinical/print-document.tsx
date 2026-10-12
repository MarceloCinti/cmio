import type { ReactNode } from "react";
import { PrintButton } from "./print-button";
import { formatCalendarDate, formatDateTime } from "@/lib/format";

type Props = {
  title: string;
  institution: { name: string; shortName: string; address: string; addressReference: string; city: string; phones: { number: string }[] };
  professional: { name: string; licenseNumber: string | null; verified: boolean };
  patient: { name: string; document: string | null; birthDate: Date | null };
  issuedAt: Date | null;
  code: string;
  voided: boolean;
  voidReason: string | null;
  verifyUrl: string;
  children: ReactNode;
};

export function PrintDocument({ title, institution, professional, patient, issuedAt, code, voided, voidReason, verifyUrl, children }: Props) {
  return (
    <main id="contenido" className="mx-auto max-w-[210mm]">
      <div className="mb-4 flex justify-end gap-2 px-4 print:hidden">
        <PrintButton />
      </div>
      <article className="relative mx-auto min-h-[270mm] bg-white p-[14mm] text-[11pt] leading-relaxed text-black shadow-lift print:shadow-none">
        {voided ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="-rotate-30 text-[64pt] font-black tracking-widest text-red-600/25">ANULADA</span>
          </div>
        ) : null}
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
          <div>
            <p className="text-[14pt] font-bold">
              {institution.shortName} — {institution.name}
            </p>
            <p className="text-[9pt]">
              {institution.address}, {institution.addressReference}, {institution.city}
              {institution.phones[0] ? ` · Tel. ${institution.phones.map((p) => p.number).join(" / ")}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13pt] font-bold uppercase">{title}</p>
            <p className="text-[9pt]">Fecha: {issuedAt ? formatDateTime(issuedAt) : "Borrador (sin emitir)"}</p>
          </div>
        </header>
        <section className="mt-4 grid grid-cols-2 gap-2 text-[10pt]">
          <p>
            <strong>Paciente:</strong> {patient.name}
          </p>
          <p>
            <strong>Documento:</strong> {patient.document ?? "—"}
          </p>
          <p>
            <strong>Fecha de nacimiento:</strong> {patient.birthDate ? formatCalendarDate(patient.birthDate) : "—"}
          </p>
          <p>
            <strong>Profesional:</strong> {professional.name}
          </p>
        </section>
        <section className="mt-6 min-h-[120mm]">{children}</section>
        <footer className="mt-10">
          <div className="flex items-end justify-between gap-8">
            <div className="text-[9pt]">
              <p>
                Código de verificación: <strong className="font-mono text-[11pt]">{code}</strong>
              </p>
              <p>Verificar en: {verifyUrl}</p>
              {voided ? <p className="font-bold text-red-700">DOCUMENTO ANULADO{voidReason ? `: ${voidReason}` : ""}</p> : null}
            </div>
            <div className="w-64 text-center text-[9pt]">
              <div className="mb-1 h-16 border-b border-black" />
              <p>Firma y sello del profesional</p>
              <p>{professional.name}</p>
              <p>Registro profesional: {professional.verified && professional.licenseNumber ? professional.licenseNumber : "________________"}</p>
            </div>
          </div>
          <p className="mt-6 border-t border-black pt-2 text-[8pt]">
            Documento generado por la plataforma de gestión de {institution.shortName}. No cuenta con firma digital: solo es válido con la firma y el sello manuscritos del profesional.
          </p>
        </footer>
      </article>
    </main>
  );
}
