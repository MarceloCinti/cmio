import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { VerifyEmailForm } from "@/components/auth/simple-forms";

export const metadata: Metadata = { title: "Confirmar correo", robots: { index: false }, referrer: "no-referrer" };

// La confirmación requiere pulsar un botón (POST): algunos filtros de correo abren los
// enlaces automáticamente y no deben consumir el token.
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verificar-correo">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Confirma tu correo</h1>
      {token ? (
        <>
          <p className="mt-2 text-muted">Pulsa el botón para activar tu cuenta de paciente.</p>
          <div className="mt-8">
            <VerifyEmailForm token={token} />
          </div>
        </>
      ) : (
        <Alert tone="error" className="mt-6">
          El enlace está incompleto. Ábrelo nuevamente desde el correo que te enviamos.
        </Alert>
      )}
    </div>
  );
}
