import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentActor, safeNextPath } from "@/server/auth/current";
import { DEMO_ACCOUNTS, isDemoMode } from "@/lib/demo-accounts";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

const MESSAGES: Record<string, { tone: "success" | "info"; text: string }> = {
  verificado: { tone: "success", text: "¡Listo! Confirmaste tu correo. Ya puedes ingresar." },
  restablecida: { tone: "success", text: "Tu contraseña fue actualizada. Ingresa con tu nueva contraseña." },
  activada: { tone: "success", text: "Tu cuenta quedó activada. Ingresa con tu correo y la contraseña que creaste." },
  salida: { tone: "info", text: "Cerraste tu sesión de forma segura." },
};

export default async function LoginPage({ searchParams }: PageProps<"/ingresar">) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.siguiente === "string" ? sp.siguiente : null) ?? undefined;
  const actor = await getCurrentActor();
  if (actor) redirect(next ?? (actor.role === "PATIENT" ? "/portal" : "/panel"));
  const message = Object.keys(MESSAGES).find((k) => sp[k] === "1");
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Ingresar</h1>
      <p className="mt-2 text-muted">Accede al portal de pacientes o al panel de la clínica.</p>
      {message ? (
        <Alert tone={MESSAGES[message].tone} className="mt-6">
          {MESSAGES[message].text}
        </Alert>
      ) : null}
      <div className="mt-8">
        {/* Las cuentas de prueba solo se envían al navegador en una instancia de demostración. */}
        <LoginForm next={next} demoAccounts={isDemoMode() ? DEMO_ACCOUNTS : undefined} />
      </div>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-sm">
        <p className="font-semibold text-ink">¿Eres paciente y todavía no tienes cuenta?</p>
        <p className="mt-1 text-muted">Crea tu cuenta para agendar y gestionar tus citas en línea.</p>
        <Link href={`/registro${next ? `?siguiente=${encodeURIComponent(next)}` : ""}`} className="mt-3 inline-block font-semibold text-primary hover:underline">
          Crear una cuenta de paciente
        </Link>
      </div>
    </div>
  );
}
