"use client";

import { useState } from "react";
import { CHART } from "./chart-utils";

/** Barras horizontales de una serie con el valor en la punta (comparación de magnitudes). */
export function BarList({ rows, label, valueSuffix = "" }: { rows: { label: string; value: number }[]; label: string; valueSuffix?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return <p className="text-sm text-muted">Sin datos para el período seleccionado.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li
            key={r.label}
            className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="truncate text-sm text-ink" title={r.label}>
              {r.label}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="block h-5 rounded-r-[4px] transition-opacity"
                style={{
                  width: `${Math.max((r.value / max) * 85, r.value > 0 ? 1.5 : 0)}%`,
                  background: CHART.series,
                  opacity: hover === null || hover === i ? 1 : 0.55,
                }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-ink tabular-nums">
                {new Intl.NumberFormat("es-PY").format(r.value)}
                {valueSuffix}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
