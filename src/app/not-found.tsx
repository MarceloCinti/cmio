import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="contenido" className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <Link href="/" className="inline-block" aria-label="Ir al inicio">
          <LogoMark className="mx-auto size-12" />
        </Link>
        <p className="mt-6 text-sm font-semibold text-primary">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">No encontramos esta página</h1>
        <p className="mt-3 text-muted">Es posible que el enlace esté desactualizado o que la página haya sido movida.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/">Ir al inicio</ButtonLink>
          <ButtonLink href="/contacto" variant="outline">
            Contactar a la clínica
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
