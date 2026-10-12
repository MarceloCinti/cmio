"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

function luminance(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Verifica el contraste de los colores elegidos (WCAG AA: 4,5:1 para texto). */
export function BrandingContrast({ value }: { value: Record<string, unknown> }) {
  const checks = [
    { label: "Texto blanco sobre el color institucional", ratio: contrast("#ffffff", String(value.primaryColor)) },
    { label: "Texto blanco sobre el color de acento (botones)", ratio: contrast("#ffffff", String(value.accentColor)) },
    { label: "Color de textos sobre fondo blanco", ratio: contrast(String(value.inkColor), "#ffffff") },
  ];
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold text-ink">Contraste y accesibilidad</p>
      <ul className="space-y-1.5 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            {c.ratio >= 4.5 ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" /> : <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />}
            {c.label}: {c.ratio.toFixed(1)}:1 {c.ratio >= 4.5 ? "(adecuado)" : "(insuficiente: elige un tono más oscuro)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
