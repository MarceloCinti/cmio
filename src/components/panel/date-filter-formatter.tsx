"use client";

import { ColumnChart } from "@/components/charts/column-chart";

const fmt = new Intl.DateTimeFormat("es-PY", { day: "numeric", month: "short", timeZone: "UTC" });

export function DateFilterFormatter({ data, label }: { data: { key: string; value: number }[]; label: string }) {
  return <ColumnChart data={data} label={label} formatLabel={(k) => fmt.format(new Date(`${k}T12:00:00Z`))} />;
}
