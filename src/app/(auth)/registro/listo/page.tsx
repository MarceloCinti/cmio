import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { ResendVerificationForm } from "@/components/auth/simple-forms";

export const metadata: Metadata = { title: "Confirma tu correo", robots: { index: false } };

export default async function RegisterDonePage({ searchParams }: PageProps<"/registro/listo">) {
  const sp = await searchParams;
  const email = typeof sp.correo === "string" ? sp.correo.slice(0, 160) : "";
  return (
    <div>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <MailCheck className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-bold text-ink">Confirma tu correo</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Creamos tu cuenta{email ? (
          <>
            {" "}y enviamos un enlace de confirmación a <strong className="text-ink">{email}</strong>
          </>
        ) : null}
        . Ábrelo para activar tu acceso. El enlace vence en 24 horas.
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-ink">¿No recibiste el correo?</p>
        <p className="mt-1 text-sm text-muted">Revisa la carpeta de correo no deseado o solicita un nuevo enlace.</p>
        <div className="mt-4">
          <ResendVerificationForm defaultEmail={email} />
        </div>
      </div>
    </div>
  );
}
