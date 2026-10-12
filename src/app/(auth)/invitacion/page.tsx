import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { NewPasswordForm } from "@/components/auth/simple-forms";
import { checkInvitationToken } from "@/server/services/auth";

export const metadata: Metadata = { title: "Activar cuenta", robots: { index: false }, referrer: "no-referrer" };

export default async function InvitationPage({ searchParams }: PageProps<"/invitacion">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const invitation = token ? await checkInvitationToken(token) : null;
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Activa tu cuenta</h1>
      {invitation ? (
        <>
          <p className="mt-2 text-muted">
            Hola, {invitation.name}. Crea una contraseña para ingresar con <strong className="text-ink">{invitation.email}</strong>.
          </p>
          <div className="mt-8">
            <NewPasswordForm token={token} mode="invitation" />
          </div>
        </>
      ) : (
        <Alert tone="error" title="La invitación no es válida" className="mt-6">
          Es posible que haya vencido (72 horas) o que ya se haya utilizado. Pide a la clínica que te envíe una nueva invitación.
        </Alert>
      )}
    </div>
  );
}
