"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Eye, EyeOff, LogIn, UserRound } from "lucide-react";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { loginSchema } from "@/lib/validation/auth";
import { loginAction } from "@/app/(auth)/actions";
import type { DemoAccount } from "@/lib/demo-accounts";

const ROLE_NAMES: Record<DemoAccount["role"], string> = {
  OWNER: "Propietario",
  ADMIN: "Administración",
  SECRETARY: "Secretaría",
  DOCTOR: "Profesional",
  PATIENT: "Paciente",
};

export function LoginForm({ next, demoAccounts }: { next?: string; demoAccounts?: DemoAccount[] }) {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Completa el formulario con una cuenta de demostración (los campos no son controlados).
  function fillDemo(account: DemoAccount) {
    const root = wrapRef.current;
    const set = (name: string, value: string) => {
      const input = root?.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) return;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("email", account.email);
    set("password", account.password);
    setSelected(account.email);
    root?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  }

  return (
    <div ref={wrapRef}>
      <ActionForm action={loginAction} schema={loginSchema} className="space-y-5">
        {next ? <input type="hidden" name="siguiente" value={next} /> : null}
        <TextField name="email" label="Correo electrónico" type="email" inputMode="email" autoComplete="username" required autoFocus />
        <div className="space-y-1.5">
          <div className="relative">
            <TextField name="password" label="Contraseña" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-12" />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute top-[2.05rem] right-1.5 flex size-9 items-center justify-center rounded-lg text-muted hover:text-ink"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={show}
            >
              {show ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
            </button>
          </div>
          <div className="text-right">
            <Link href="/recuperar-contrasena" className="text-sm font-medium text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
        <SubmitButton className="w-full" size="lg" pendingLabel="Ingresando…">
          <LogIn className="size-5" aria-hidden="true" /> Ingresar
        </SubmitButton>
      </ActionForm>
      {demoAccounts?.length ? (
        <section aria-labelledby="usuarios-prueba" className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <h2 id="usuarios-prueba" className="text-base font-semibold text-ink">
            Usuarios de prueba
          </h2>
          <p className="mt-1 text-sm text-ink/80">
            Entorno de demostración con datos ficticios. Toca un usuario para completar el correo y la contraseña, y luego presiona «Ingresar».
          </p>
          {[
            {
              title: "Personal de la clínica",
              items: demoAccounts.filter((a) => a.role !== "PATIENT"),
            },
            {
              title: "Pacientes",
              items: demoAccounts.filter((a) => a.role === "PATIENT"),
            },
          ].map((group) =>
            group.items.length ? (
              <div key={group.title} className="mt-4">
                <h3 className="text-xs font-semibold tracking-wide text-ink/70 uppercase">{group.title}</h3>
                <ul className="mt-2 grid gap-2">
                  {group.items.map((a) => (
                    <li key={a.email}>
                      <button
                        type="button"
                        onClick={() => fillDemo(a)}
                        aria-pressed={selected === a.email}
                        className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3 text-left transition hover:border-primary aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/20"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <UserRound className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">
                            {ROLE_NAMES[a.role]} · {a.name}
                          </span>
                          <span className="block truncate text-xs text-muted">{a.email}</span>
                          <span className="mt-0.5 block text-xs text-ink/75">{a.description}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          <p className="sr-only" aria-live="polite">
            {selected ? `Datos de ${selected} completados. Presiona Ingresar.` : ""}
          </p>
        </section>
      ) : null}
    </div>
  );
}
