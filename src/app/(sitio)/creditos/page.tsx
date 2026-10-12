import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/site/page-hero";
import { STOCK_IMAGE_LIST } from "@/lib/images";

export const metadata: Metadata = { title: "Créditos de imágenes", alternates: { canonical: "/creditos" }, robots: { index: false } };

export default function CreditsPage() {
  return (
    <>
      <PageHero
        title="Créditos de imágenes"
        intro="Las fotografías del sitio son imágenes ilustrativas de bancos de imágenes con licencia de uso comercial. No corresponden a las instalaciones ni al personal de la clínica."
      />
      <div className="container-page py-12">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          . Las personas que aparecen en las fotografías no respaldan a la clínica.
        </p>
      </div>
    </>
  );
}
