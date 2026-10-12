import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DemoBanner } from "@/components/demo-banner";
import { getSiteContent } from "@/server/services/settings";
import { STOCK_IMAGES } from "@/lib/images";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { branding, institution } = await getSiteContent("published");
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <div className="grid grid-cols-1 flex-1 lg:grid-cols-[1fr_1.05fr]">
        <div className="flex flex-col px-4 py-6 sm:px-8 lg:px-14">
          <Link href="/" className="self-start rounded-lg" aria-label="Ir al sitio de la clínica">
            <Logo logoPath={branding.logoPath} logoAlt={branding.logoAlt} shortName={institution.shortName} subtitle={institution.name} />
          </Link>
          <main id="contenido" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            {children}
          </main>
          <p className="text-center text-xs text-muted">
            ¿Necesitas ayuda? Comunícate con la secretaría al {institution.phones[0]?.number ?? "teléfono de la clínica"}.
          </p>
        </div>
        <div className="relative hidden overflow-hidden bg-primary lg:block">
          <Image
            src={STOCK_IMAGES.consultaMedica.path}
            alt=""
            fill
            sizes="50vw"
            className="object-cover opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <p className="max-w-md text-2xl leading-snug font-semibold">Tu atención, tus citas y tus documentos en un solo lugar, con la privacidad que merecen.</p>
            <p className="mt-3 text-sm text-white/80">Imagen ilustrativa.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
