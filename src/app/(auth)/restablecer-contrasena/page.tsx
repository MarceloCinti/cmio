import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { NewPasswordForm } from "@/components/auth/simple-forms";
import { checkResetToken } from "@/server/services/auth";

export const metadata: Metadata = { title: "Restablecer contraseña", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/restablecer-contrasena">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const valid = token ? await checkResetToken(token) : null;
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Crea una nueva contraseña</h1>
      {valid ? (
        <>
          <p className="mt-2 text-muted">Para la cuenta {valid.email}. Al guardarla se cerrarán las sesiones abiertas en otros dispositivos.</p>
          <div className="mt-8">
            <NewPasswordForm token={token} mode="reset" />
          </div>
        </>
      ) : (
        <Alert tone="error" title="El enlace no es válido" className="mt-6">
          Es posible que haya vencido o que ya se haya utilizado.{" "}
          <Link href="/recuperar-contrasena" className="font-semibold underline">
            Solicita un nuevo enlace
          </Link>
          .
        </Alert>
      )}
    </div>
  );
}
