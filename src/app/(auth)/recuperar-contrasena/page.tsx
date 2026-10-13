import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/simple-forms";
import { Alert } from "@/components/ui/alert";
import { selfRegistrationAvailable } from "@/server/services/auth";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function ForgotPasswordPage() {
  // Sin correo configurado no se puede enviar el enlace: no se ofrece un formulario que no funciona.
  const emailAvailable = selfRegistrationAvailable();
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Recuperar contraseña</h1>
      {emailAvailable ? <p className="mt-2 text-muted">Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.</p> : null}
      <div className="mt-8">
        {emailAvailable ? (
          <ForgotPasswordForm />
        ) : (
          <Alert tone="warning" title="Recuperación por correo no disponible">
            Por el momento la clínica no tiene habilitado el envío de correos. Comunícate con la secretaría para restablecer tu acceso.
          </Alert>
        )}
      </div>
      <p className="mt-8 text-center text-sm">
        <Link href="/ingresar" className="font-semibold text-primary hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </div>
  );
}
