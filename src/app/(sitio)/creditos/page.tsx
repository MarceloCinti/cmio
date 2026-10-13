import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/site/page-hero";
import { CLINIC_IMAGE_LIST, STOCK_IMAGE_LIST } from "@/lib/images";

export const metadata: Metadata = { title: "Créditos de imágenes", alternates: { canonical: "/creditos" }, robots: { index: false } };

export default function CreditsPage() {
  return (
    <>
      <PageHero
        title="Créditos de imágenes"
        intro="El sitio combina fotografías propias del CMIO, que muestran a profesionales reales del centro, con imágenes ilustrativas de bancos de imágenes con licencia de uso comercial."
      />
      <div className="container-page space-y-12 py-12">
        <section aria-labelledby="fotos-cmio">
          <h2 id="fotos-cmio" className="text-xl font-semibold text-ink">
            Fotografías del CMIO
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">Proporcionadas por la clínica o tomadas de sus publicaciones oficiales. Todos los derechos pertenecen al CMIO.</p>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CLINIC_IMAGE_LIST.map((img) => (
              <li key={img.path} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="relative aspect-[16/10] bg-primary-soft">
                  <Image src={img.path} alt={img.alt} fill sizes="(min-width: 1024px) 30vw, 100vw" className={img.width === img.height ? "object-contain" : "object-cover object-[center_25%]"} />
                </div>
                <div className="space-y-1 p-4 text-sm">
                  <p className="text-ink">{img.alt}</p>
                  <p className="text-muted">Fuente: {img.source}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="fotos-ilustrativas">
          <h2 id="fotos-ilustrativas" className="text-xl font-semibold text-ink">
            Imágenes ilustrativas
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Provienen de bancos de imágenes con licencia de uso comercial. No corresponden a las instalaciones ni al personal de la clínica.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STOCK_IMAGE_LIST.map((img) => (
              <li key={img.path} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="relative aspect-[16/10] bg-primary-soft">
                  <Image src={img.path} alt={img.alt} fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />
                </div>
                <div className="space-y-1 p-4 text-sm">
                  <p className="text-ink">{img.alt}</p>
                  <p className="text-muted">
                    Autor: {img.author} · Licencia {img.license}
                  </p>
                  <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                    Ver fuente original
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">
            Licencia de Pexels:{" "}
            <a href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              pexels.com/license
            </a>
            . Las personas que aparecen en estas fotografías no respaldan a la clínica.
          </p>
        </section>
      </div>
    </>
  );
}
