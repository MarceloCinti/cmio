import Link from "next/link";
import { CalendarPlus, MessageCircle, Phone } from "lucide-react";

/** Acciones principales siempre accesibles en celulares. */
export function MobileActionBar({ phoneHref, whatsappHref }: { phoneHref: string | null; whatsappHref: string | null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <nav aria-label="Acciones rápidas" className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2">
        <Link
          href="/solicitar-cita"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-3 font-semibold text-white"
        >
          <CalendarPlus className="size-5" aria-hidden="true" /> Solicitar cita
        </Link>
        {phoneHref ? (
          <a href={phoneHref} className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary" aria-label="Llamar a la clínica">
            <Phone className="size-5" aria-hidden="true" />
          </a>
        ) : null}
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-12 items-center justify-center rounded-xl bg-wellness-soft text-ink"
            aria-label="Escribir por WhatsApp"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
          </a>
        ) : null}
      </nav>
    </div>
  );
}
