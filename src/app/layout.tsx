import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BrandStyle } from "@/components/brand/brand-style";
import { ToastProvider } from "@/components/ui/toast";
import { getSiteContent } from "@/server/services/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { landing, institution } = await getSiteContent("published");
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: { default: landing.seo.title, template: `%s · ${institution.shortName}` },
    description: landing.seo.description,
    applicationName: `${institution.shortName} — ${institution.name}`,
    openGraph: {
      type: "website",
      locale: "es_PY",
      siteName: `${institution.shortName} — ${institution.name}`,
      title: landing.seo.title,
      description: landing.seo.description,
      images: [{ url: landing.hero.imagePath, alt: landing.hero.imageAlt }],
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e6e6b",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { branding } = await getSiteContent("published");
  return (
    <html lang="es-PY" data-scroll-behavior="smooth">
      <head>
        <BrandStyle branding={branding} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-primary focus:shadow-lift"
        >
          Saltar al contenido
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
