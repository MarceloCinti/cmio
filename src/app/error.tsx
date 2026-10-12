"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[cmio] Error en la interfaz:", error.digest ?? error.name);
  }, [error]);
  return (
    <main id="contenido" className="flex min-h-[70dvh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary">Algo salió mal</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">No pudimos mostrar esta página</h1>
        <p className="mt-3 text-muted">
          Ocurrió un error inesperado. Intenta nuevamente; si el problema continúa, comunícate con la clínica.
          {error.digest ? <span className="mt-2 block text-xs">Código de referencia: {error.digest}</span> : null}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>Intentar nuevamente</Button>
          <ButtonLink href="/" variant="outline">
            Ir al inicio
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
