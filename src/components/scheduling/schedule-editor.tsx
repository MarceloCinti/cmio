"use client";

import { useState } from "react";
import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextField, inputClasses } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { WEEKDAY_LABELS, minutesToHHMM } from "@/lib/format";
import { createExceptionAction, saveRulesAction } from "@/actions/schedules";

type Rule = { weekday: number; start: string; end: string; key: number };

export function WeeklyScheduleEditor({ professionalId, rules }: { professionalId: string; rules: { weekday: number; startMinute: number; endMinute: number }[] }) {
  let k = 0;
  const [items, setItems] = useState<Rule[]>(
    rules.map((r) => ({ weekday: r.weekday, start: minutesToHHMM(r.startMinute), end: minutesToHHMM(r.endMinute), key: k++ })),
  );
  const [nextKey, setNextKey] = useState(k + 1);
  const add = (weekday: number, start = "08:00", end = "12:00") => {
    setItems((list) => [...list, { weekday, start, end, key: nextKey }]);
    setNextKey((n) => n + 1);
  };
  const update = (key: number, patch: Partial<Rule>) => setItems((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const copyToWeekdays = (weekday: number) => {
    const source = items.filter((r) => r.weekday === weekday);
    let n = nextKey;
    const others = [1, 2, 3, 4, 5].filter((d) => d !== weekday);
    setItems((list) => [...list.filter((r) => !others.includes(r.weekday)), ...others.flatMap((d) => source.map((s) => ({ ...s, weekday: d, key: n++ })))]);
    setNextKey(n);
  };

  return (
    <ActionForm action={saveRulesAction} className="space-y-4">
      <input type="hidden" name="professionalId" value={professionalId} />
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const dayItems = items.filter((r) => r.weekday === d);
          return (
            <li key={d} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
              <p className="w-28 shrink-0 pt-2 font-medium text-ink">{WEEKDAY_LABELS[d]}</p>
              <div className="flex-1 space-y-2">
                {dayItems.length ? (
                  dayItems.map((r) => (
                    <div key={r.key} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="weekday[]" value={d} />
                      <label className="sr-only" htmlFor={`s-${r.key}`}>Inicio</label>
                      <input id={`s-${r.key}`} type="time" name="start[]" step={300} value={r.start} onChange={(e) => update(r.key, { start: e.target.value })} className={`${inputClasses} w-32`} />
                      <span className="text-muted">a</span>
                      <label className="sr-only" htmlFor={`e-${r.key}`}>Fin</label>
                      <input id={`e-${r.key}`} type="time" name="end[]" step={300} value={r.end} onChange={(e) => update(r.key, { end: e.target.value })} className={`${inputClasses} w-32`} />
                      <Button variant="ghost" size="sm" onClick={() => setItems((l) => l.filter((x) => x.key !== r.key))} aria-label={`Quitar bloque del ${WEEKDAY_LABELS[d]}`}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="pt-2 text-sm text-muted">Sin atención</p>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => add(d, dayItems.length ? "14:00" : "08:00", dayItems.length ? "18:00" : "12:00")} icon={<Plus className="size-4" aria-hidden="true" />}>
                  Bloque
                </Button>
                {dayItems.length && d <= 5 ? (
                  <Button variant="ghost" size="sm" onClick={() => copyToWeekdays(d)} icon={<Copy className="size-4" aria-hidden="true" />} title="Copiar a lunes–viernes">
                    <span className="sr-only sm:not-sr-only">Copiar a días hábiles</span>
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">
        Los descansos se definen dejando un espacio entre bloques (por ejemplo, 08:00–12:00 y 14:00–18:00). Los turnos se calculan según la duración de cada servicio.
      </p>
      <SubmitButton pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar disponibilidad
      </SubmitButton>
    </ActionForm>
  );
}

export function ExceptionForm({ professionalId, clinicWide }: { professionalId?: string; clinicWide?: boolean }) {
  const [allDay, setAllDay] = useState(true);
  const kinds = clinicWide
    ? [
        { value: "HOLIDAY", label: "Feriado" },
        { value: "CLOSURE", label: "Cierre de la clínica" },
      ]
    : [
        { value: "VACATION", label: "Vacaciones" },
        { value: "ABSENCE", label: "Ausencia" },
        { value: "BLOCK", label: "Bloqueo de agenda" },
      ];
  return (
    <ActionForm action={createExceptionAction} resetOnSuccess className="space-y-4">
      {professionalId ? <input type="hidden" name="professionalId" value={professionalId} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField name="kind" label="Tipo" options={kinds} />
        <TextField name="title" label="Descripción" required placeholder={clinicWide ? "Ej.: Día de la Independencia" : "Ej.: Congreso médico"} />
      </div>
      <CheckboxField name="allDay" label="Días completos" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField name="startDate" label="Desde" type="date" required />
        <TextField name="endDate" label="Hasta" type="date" required />
        {!allDay ? (
          <>
            <TextField name="startTime" label="Hora de inicio" type="time" step={300} required />
            <TextField name="endTime" label="Hora de fin" type="time" step={300} required />
          </>
        ) : null}
      </div>
      <SubmitButton variant="secondary" pendingLabel="Guardando…">
        <Plus className="size-4" aria-hidden="true" /> Registrar
      </SubmitButton>
    </ActionForm>
  );
}
