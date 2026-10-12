"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarCheck, Search, UserPlus, X } from "lucide-react";
import { ActionForm, CheckboxField, FieldError, SelectField, SubmitButton, TextAreaField, TextField, inputClasses } from "@/components/ui/form";
import { SlotPicker } from "@/components/scheduling/slot-picker";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { formatLongDateTime } from "@/lib/format";
import { bookFromPanelAction, searchPatientsForBookingAction, type PatientOption } from "@/app/panel/citas/actions";

type Props = {
  services: { id: string; name: string; durationMinutes: number; specialty: { name: string } | null }[];
  professionals: { id: string; name: string; serviceIds: string[] }[];
  initialPatient?: PatientOption | null;
  initialProfessionalId?: string;
  initialDate?: string;
  canOverbook: boolean;
};

export function StaffBookingForm({ services, professionals, initialPatient, initialProfessionalId, initialDate, canOverbook }: Props) {
  const [patient, setPatient] = useState<PatientOption | null>(initialPatient ?? null);
  const initialPro = professionals.find((p) => p.id === initialProfessionalId);
  const [professionalId, setProfessionalId] = useState(initialPro?.id ?? "");
  const [serviceId, setServiceId] = useState(initialPro && initialPro.serviceIds.length === 1 ? initialPro.serviceIds[0] : "");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [overbook, setOverbook] = useState(false);

  const pro = professionals.find((p) => p.id === professionalId);
  const serviceOptions = useMemo(
    () =>
      services
        .filter((s) => !pro || pro.serviceIds.includes(s.id))
        .map((s) => ({ value: s.id, label: `${s.name} (${s.durationMinutes} min)${s.specialty ? ` · ${s.specialty.name}` : ""}` })),
    [services, pro],
  );
  const proOptions = professionals
    .filter((p) => !serviceId || p.serviceIds.includes(serviceId))
    .map((p) => ({ value: p.id, label: p.name }));

  return (
    <ActionForm action={bookFromPanelAction} className="space-y-6">
      <input type="hidden" name="patientId" value={patient?.id ?? ""} />
      <input type="hidden" name="startsAt" value={startsAt ?? ""} />
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">1. Paciente</h2>
        {patient ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-primary-soft px-4 py-3">
            <div>
              <p className="font-semibold text-ink">{patient.label}</p>
              <p className="text-sm text-muted">{patient.detail}</p>
            </div>
            <button type="button" onClick={() => setPatient(null)} className="tap-target inline-flex items-center justify-center rounded-lg text-muted hover:text-ink" aria-label="Cambiar paciente">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <PatientSearch onSelect={setPatient} />
        )}
        <FieldError name="patientId" />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">2. Profesional y servicio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            name="professionalId"
            label="Profesional"
            required
            placeholder="Selecciona un profesional"
            options={proOptions}
            value={professionalId}
            onChange={(e) => {
              setProfessionalId(e.target.value);
              setStartsAt(null);
              const p = professionals.find((x) => x.id === e.target.value);
              if (p && serviceId && !p.serviceIds.includes(serviceId)) setServiceId("");
              if (p && p.serviceIds.length === 1) setServiceId(p.serviceIds[0]);
            }}
          />
          <SelectField
            name="serviceId"
            label="Servicio"
            required
            placeholder="Selecciona un servicio"
            options={serviceOptions}
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setStartsAt(null);
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">3. Fecha y horario</h2>
        {canOverbook ? (
          <CheckboxField
            name="overbook"
            label="Agendar como sobreturno (fuera de los turnos disponibles)"
            hint="Requiere indicar el motivo. Queda registrado en la auditoría."
            checked={overbook}
            onChange={(e) => {
              setOverbook(e.target.checked);
              setStartsAt(null);
            }}
            wrapperClassName="mb-4"
          />
        ) : null}
        {overbook ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField name="overbookDate" label="Fecha" type="date" required defaultValue={initialDate} />
            <TextField name="overbookTime" label="Hora" type="time" step={300} required />
            <TextField name="reason" label="Motivo del sobreturno" required maxLength={300} />
          </div>
        ) : professionalId && serviceId ? (
          <SlotPicker professionalId={professionalId} serviceId={serviceId} value={startsAt} onChange={setStartsAt} showTaken initialDate={initialDate} />
        ) : (
          <p className="text-sm text-muted">Selecciona el profesional y el servicio para ver los turnos disponibles.</p>
        )}
        <FieldError name="startsAt" />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <TextAreaField name="adminNotes" label="Observaciones administrativas" optionalLabel rows={2} maxLength={500} hint="No registres información clínica." />
      </section>

      <div className="sticky bottom-16 z-10 flex flex-col gap-3 rounded-2xl border border-line bg-surface/95 p-4 shadow-lift backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p className="text-sm text-ink" aria-live="polite">
          {startsAt ? (
            <>
              Horario elegido: <strong className="first-letter:uppercase">{formatLongDateTime(startsAt)}</strong>
            </>
          ) : overbook ? (
            "Sobreturno: indica fecha, hora y motivo."
          ) : (
            "Elige un horario disponible."
          )}
        </p>
        <SubmitButton size="lg" pendingLabel="Agendando…">
          <CalendarCheck className="size-5" aria-hidden="true" /> Agendar cita
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function PatientSearch({ onSelect }: { onSelect: (p: PatientOption) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PatientOption[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = q.trim().length >= 2;
  const shown = active ? results : [];
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) return;
    timer.current = setTimeout(() => {
      start(async () => {
        setResults(await searchPatientsForBookingAction(q));
        setSearched(true);
      });
    }, 300);
  }, [q]);

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink">Buscar por nombre, documento o teléfono</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={cn(inputClasses, "pl-9")}
            placeholder="Ej.: Benítez, 4567890 o 0981…"
            autoComplete="off"
            aria-describedby="patient-search-status"
          />
        </span>
      </label>
      <div id="patient-search-status" aria-live="polite" className="text-sm text-muted">
        {pending ? <Spinner className="size-4" label="Buscando…" /> : active && searched && !shown.length ? "No se encontraron pacientes." : null}
      </div>
      {shown.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {shown.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onSelect(r)} className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-primary-soft">
                <span className="font-medium text-ink">{r.label}</span>
                <span className="text-sm text-muted">{r.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Link href="/panel/pacientes/nuevo?siguiente=agendar" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <UserPlus className="size-4" aria-hidden="true" /> Registrar un paciente nuevo
      </Link>
    </div>
  );
}
