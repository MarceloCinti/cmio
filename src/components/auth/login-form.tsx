"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { loginSchema } from "@/lib/validation/auth";
import { loginAction } from "@/app/(auth)/actions";

export function LoginForm({ next }: { next?: string }) {
  const [show, setShow] = useState(false);
  return (
    <ActionForm action={loginAction} schema={loginSchema} className="space-y-5">
      {next ? <input type="hidden" name="siguiente" value={next} /> : null}
      <TextField name="email" label="Correo electrónico" type="email" inputMode="email" autoComplete="username" required autoFocus />
      <div className="space-y-1.5">
        <div className="relative">
          <TextField
            name="password"
            label="Contraseña"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-12"
          />
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
  );
}
