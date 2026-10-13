/** Ícono de Instagram (trazo simple, mismo estilo que el resto de íconos del sitio). */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** "@cuenta" a partir del enlace de un perfil (https://www.instagram.com/cuenta). */
export function socialHandle(url: string) {
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean)[0];
    return segment ? `@${segment}` : url;
  } catch {
    return url;
  }
}
