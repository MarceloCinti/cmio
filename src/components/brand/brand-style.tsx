import { FONT_PAIRS, type Branding } from "@/lib/site-content";

const HEX = /^#[0-9a-fA-F]{6}$/;
const safe = (value: string, fallback: string) => (HEX.test(value) ? value : fallback);

/** Variables CSS de la identidad visual. Los valores se validan como hexadecimales. */
export function brandCss(branding: Branding, selector = ":root") {
  const fonts = FONT_PAIRS[branding.fontPair] ?? FONT_PAIRS.moderna;
  return `${selector}{--brand-primary:${safe(branding.primaryColor, "#0e6e6b")};--brand-accent:${safe(
    branding.accentColor,
    "#b4532f",
  )};--brand-wellness:${safe(branding.wellnessColor, "#5e9c7c")};--brand-ink:${safe(
    branding.inkColor,
    "#12303a",
  )};--font-heading-family:"${fonts.heading}";--font-body-family:"${fonts.body}";}`;
}

export function BrandStyle({ branding, selector }: { branding: Branding; selector?: string }) {
  return <style dangerouslySetInnerHTML={{ __html: brandCss(branding, selector) }} />;
}
