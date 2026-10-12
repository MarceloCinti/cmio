"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CHART, niceTicks } from "./chart-utils";

export type LinePoint = { t: string; v: number };

type Props = {
  points: LinePoint[];
  unit: string;
  /** Descripción accesible del gráfico. */
  label: string;
  height?: number;
  reference?: { value: number; label: string } | null;
  formatDate?: (iso: string) => string;
};

const defaultDate = (iso: string) =>
  new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Asuncion" }).format(new Date(iso));

/** Línea de una sola serie con mira, tooltip, foco por teclado y vista de tabla. */
export function LineChart({ points, unit, label, height = 240, reference, formatDate = defaultDate }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fmt = (v: number) => `${new Intl.NumberFormat("es-PY", { maximumFractionDigits: 1 }).format(v)} ${unit}`;
  const m = { top: 16, right: 64, bottom: 28, left: 44 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;

  const geom = useMemo(() => {
    const times = points.map((p) => new Date(p.t).getTime());
    const values = points.map((p) => p.v).concat(reference ? [reference.value] : []);
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    const ticks = niceTicks(Math.min(...values), Math.max(...values), 4);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const x = (t: number) => (tMax === tMin ? innerW / 2 : ((t - tMin) / (tMax - tMin)) * innerW);
    const y = (v: number) => innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
    const xy = points.map((p, i) => ({ x: x(times[i]), y: y(p.v) }));
    return { ticks, x, y, xy, tMin, tMax };
  }, [points, reference, innerW, innerH]);

  if (!points.length) return <p className="text-sm text-muted">Todavía no hay registros para graficar.</p>;

  const path = geom.xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${geom.xy[geom.xy.length - 1].x.toFixed(1)},${innerH} L${geom.xy[0].x.toFixed(1)},${innerH} Z`;
  const xTickIdx = points.length <= 5 ? points.map((_, i) => i) : [0, Math.floor(points.length / 3), Math.floor((2 * points.length) / 3), points.length - 1];
  const last = geom.xy[geom.xy.length - 1];
  const a = active !== null ? geom.xy[active] : null;

  const nearest = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - m.left;
    let best = 0;
    for (let i = 1; i < geom.xy.length; i++) if (Math.abs(geom.xy[i].x - px) < Math.abs(geom.xy[best].x - px)) best = i;
    return best;
  };

  return (
    <div ref={wrap} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${label}. ${points.length} registros; último: ${fmt(points[points.length - 1].v)} el ${formatDate(points[points.length - 1].t)}. Usa las flechas para recorrer los valores.`}
        aria-describedby={tableId}
        tabIndex={0}
        className="block touch-pan-y rounded-lg outline-offset-4"
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? points.length) - 1));
          if (e.key === "ArrowRight") setActive((i) => Math.min(points.length - 1, (i ?? -1) + 1));
        }}
      >
        <g transform={`translate(${m.left},${m.top})`}>
          {geom.ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={geom.y(t)} y2={geom.y(t)} stroke={CHART.grid} strokeWidth={1} />
              <text x={-8} y={geom.y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHART.axisText} style={{ fontVariantNumeric: "tabular-nums" }}>
                {new Intl.NumberFormat("es-PY", { maximumFractionDigits: 1 }).format(t)}
              </text>
            </g>
          ))}
          {xTickIdx.map((i) => (
            <text key={i} x={geom.xy[i].x} y={innerH + 18} textAnchor="middle" fontSize={11} fill={CHART.axisText}>
              {formatDate(points[i].t)}
            </text>
          ))}
          {reference ? (
            <g>
              <line x1={0} x2={innerW} y1={geom.y(reference.value)} y2={geom.y(reference.value)} stroke={CHART.axisText} strokeWidth={1} />
              {/* Etiqueta dentro del área del gráfico para que no se corte en pantallas angostas. */}
              <text x={6} y={geom.y(reference.value) - 6} fontSize={11} fill={CHART.axisText}>
                {reference.label}
              </text>
            </g>
          ) : null}
          <path d={area} fill={CHART.seriesWash} />
          <path d={path} fill="none" stroke={CHART.series} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.length <= 40
            ? geom.xy.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill={CHART.series} stroke={CHART.surface} strokeWidth={2} />)
            : null}
          <text x={last.x + 8} y={last.y} dy="0.32em" fontSize={12} fontWeight={600} fill={CHART.ink}>
            {fmt(points[points.length - 1].v)}
          </text>
          {a ? (
            <g pointerEvents="none">
              <line x1={a.x} x2={a.x} y1={0} y2={innerH} stroke={CHART.axisText} strokeWidth={1} />
              <circle cx={a.x} cy={a.y} r={6} fill={CHART.series} stroke={CHART.surface} strokeWidth={2} />
            </g>
          ) : null}
        </g>
      </svg>
      {a && active !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lift"
          style={{
            left: Math.min(Math.max(a.x + m.left - 70, 0), width - 150),
            top: Math.max(a.y + m.top - 64, 0),
          }}
        >
          <p className="font-semibold text-ink">{fmt(points[active].v)}</p>
          <p className="text-xs text-muted">{formatDate(points[active].t)}</p>
        </div>
      ) : null}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium text-primary">Ver datos en tabla</summary>
        <table id={tableId} className="mt-2 w-full max-w-sm text-left">
          <caption className="sr-only">{label}</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="py-1 font-semibold">Fecha</th>
              <th scope="col" className="py-1 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {points.map((p) => (
              <tr key={p.t}>
                <td className="py-1">{formatDate(p.t)}</td>
                <td className="py-1 text-right tabular-nums">{fmt(p.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
