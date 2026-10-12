// Utilidades compartidas por los gráficos. Color de serie validado (croma, luminosidad y
// contraste) con el validador de paleta: no se deriva del color institucional configurable.
export const CHART = {
  series: "#0d9488",
  seriesWash: "rgba(13, 148, 136, 0.10)",
  grid: "#e3e9e7",
  axisText: "#55676c",
  ink: "#12303a",
  surface: "#ffffff",
};

/** Escala "limpia" de marcas del eje (pasos 1, 2, 2.5, 5 × 10^k). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

export function compact(n: number) {
  if (Math.abs(n) >= 1000) return `${new Intl.NumberFormat("es-PY", { maximumFractionDigits: 1 }).format(n / 1000)} mil`;
  return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 1 }).format(n);
}
