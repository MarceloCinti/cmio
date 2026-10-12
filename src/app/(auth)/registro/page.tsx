import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentActor, safeNextPath } from "@/server/auth/current";
import { selfRegistrationAvailable } from "@/server/services/auth";

export const metadata: Metadata = { title: "Crear cuenta de paciente", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/registro">) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.siguiente === "string" ? sp.siguiente : null) ?? undefined;
  const actor = await getCurrentActor();
  if (actor) redirect(actor.role === "PATIENT" ? "/portal" : "/panel");
  const available = selfRegistrationAvailable();
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Crear cuenta de paciente</h1>
      <p className="mt-2 text-muted">Solo te pediremos los datos necesarios para identificarte y gestionar tus citas.</p>
      <div className="mt-8">
        {available ? (
          <RegisterForm next={next} />
        ) : (
          <Alert tone="warning" title="Registro en línea no disponible">
            Por el momento la clínica no tiene habilitado el registro en línea. Comunícate con la secretaría para que te envíen una invitación al portal.
          </Alert>
        )}
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        ¿Ya tienes una cuenta?{" "}
        <Link href={`/ingresar${next ? `?siguiente=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Ingresar
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted">
        Si eres profesional de la clínica, tu acceso se crea mediante una invitación del administrador.
      </p>
    </div>
  );
}
