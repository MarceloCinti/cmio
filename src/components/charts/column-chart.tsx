"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CHART, niceTicks } from "./chart-utils";

/** Columnas de una serie (conteos por día) con tooltip por columna y vista de tabla. */
export function ColumnChart({
  data,
  label,
  height = 220,
  formatLabel,
}: {
  data: { key: string; value: number }[];
  label: string;
  height?: number;
  formatLabel: (key: string) => string;
}) {
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
  if (!data.length) return <p className="text-sm text-muted">Sin datos para el período seleccionado.</p>;

  const m = { top: 18, right: 8, bottom: 26, left: 32 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const ticks = niceTicks(0, Math.max(...data.map((d) => d.value), 4), 4).filter((t) => t >= 0 && Number.isInteger(t));
  const yMax = ticks[ticks.length - 1] || 1;
  const band = innerW / data.length;
  const barW = Math.min(24, Math.max(3, band - 2));
  const y = (v: number) => innerH - (v / yMax) * innerH;
  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const every = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 64)));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div ref={wrap} className="relative w-full min-w-0">
      <svg width={width} height={height} role="img" aria-label={`${label}. Total: ${total}.`} aria-describedby={tableId} className="block">
        <g transform={`translate(${m.left},${m.top})`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
              <text x={-6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHART.axisText} style={{ fontVariantNumeric: "tabular-nums" }}>
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = i * band + band / 2;
            const h = innerH - y(d.value);
            const r = Math.min(4, h, barW / 2);
            const x0 = cx - barW / 2;
            const y0 = y(d.value);
            const path =
              h > 0
                ? `M${x0},${innerH} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + barW - r} Q${x0 + barW},${y0} ${x0 + barW},${y0 + r} V${innerH} Z`
                : "";
            return (
              <g key={d.key}>
                {path ? <path d={path} fill={CHART.series} opacity={active === null || active === i ? 1 : 0.55} /> : null}
                {i === maxIdx && d.value > 0 ? (
                  <text x={cx} y={y0 - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill={CHART.ink}>
                    {d.value}
                  </text>
                ) : null}
                {i % every === 0 ? (
                  <text x={cx} y={innerH + 17} textAnchor="middle" fontSize={11} fill={CHART.axisText}>
                    {formatLabel(d.key)}
                  </text>
                ) : null}
                <rect
                  x={i * band}
                  y={0}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${formatLabel(d.key)}: ${d.value}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </g>
      </svg>
      {active !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lift"
          style={{ left: Math.min(Math.max(active * band + m.left + band / 2 - 60, 0), width - 130), top: 0 }}
        >
          <p className="font-semibold text-ink">{data[active].value} cita(s)</p>
          <p className="text-xs text-muted">{formatLabel(data[active].key)}</p>
        </div>
      ) : null}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium text-primary">Ver datos en tabla</summary>
        <table id={tableId} className="mt-2 w-full max-w-sm text-left">
          <caption className="sr-only">{label}</caption>
          <tbody className="divide-y divide-line">
            {data.map((d) => (
              <tr key={d.key}>
                <td className="py-1">{formatLabel(d.key)}</td>
                <td className="py-1 text-right tabular-nums">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
