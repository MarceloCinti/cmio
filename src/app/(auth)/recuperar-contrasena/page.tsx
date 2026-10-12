import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/simple-forms";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Recuperar contraseña</h1>
      <p className="mt-2 text-muted">Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 text-center text-sm">
        <Link href="/ingresar" className="font-semibold text-primary hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </div>
  );
}
