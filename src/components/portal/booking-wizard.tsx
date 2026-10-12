"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, Clock, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionForm, SubmitButton, TextAreaField } from "@/components/ui/form";
import { SlotPicker } from "@/components/scheduling/slot-picker";
import { cn } from "@/lib/cn";
import { formatGuaranies, formatLongDate, formatTime } from "@/lib/format";
import { bookFromPortalAction } from "@/app/portal/actions";

type Service = { id: string; name: string; summary: string; durationMinutes: number; price: number | null; showPrice: boolean; preparationNotes: string | null };
type Specialty = { id: string; name: string; summary: string; services: Service[] };
type Professional = { id: string; name: string; serviceIds: string[] };

const STEPS = ["Especialidad", "Servicio y profesional", "Fecha y hora", "Confirmar"];

export function BookingWizard({
  specialties,
  professionals,
  initialSpecialtyId,
  initialProfessionalId,
  cancellationPolicy,
  cancelMinHours,
}: {
  specialties: Specialty[];
  professionals: Professional[];
  initialSpecialtyId?: string;
  initialProfessionalId?: string;
  cancellationPolicy: string;
  cancelMinHours: number;
}) {
  const preProf = professionals.find((p) => p.id === initialProfessionalId);
  const preSpecialty =
    specialties.find((s) => s.id === initialSpecialtyId) ??
    (preProf ? specialties.find((s) => s.services.some((svc) => preProf.serviceIds.includes(svc.id))) : undefined);

  const [step, setStep] = useState(preSpecialty ? 1 : 0);
  const [specialtyId, setSpecialtyId] = useState<string | null>(preSpecialty?.id ?? null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(preProf?.id ?? null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  // Se calcula al elegir el horario (no durante el render) para mantener el componente puro.
  const [selectedAt, setSelectedAt] = useState(0);

  const specialty = specialties.find((s) => s.id === specialtyId) ?? null;
  const services = specialty?.services ?? [];
  const service = services.find((s) => s.id === serviceId) ?? null;
  const availablePros = useMemo(
    () => (serviceId ? professionals.filter((p) => p.serviceIds.includes(serviceId)) : []),
    [professionals, serviceId],
  );
  const professional = availablePros.find((p) => p.id === professionalId) ?? null;

  const chooseService = (id: string) => {
    setServiceId(id);
    setStartsAt(null);
    const pros = professionals.filter((p) => p.serviceIds.includes(id));
    if (pros.length === 1) setProfessionalId(pros[0].id);
    else if (!pros.some((p) => p.id === professionalId)) setProfessionalId(null);
  };

  const canNext = [Boolean(specialtyId), Boolean(serviceId && professionalId), Boolean(startsAt)][step] ?? false;

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Pasos para agendar">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-line")} />
            <span className={cn("mt-1.5 hidden text-xs sm:block", i === step ? "font-semibold text-primary" : "text-muted")}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-primary sm:hidden">
        Paso {step + 1} de 4: {STEPS[step]}
      </p>

      {step === 0 ? (
        <fieldset>
          <legend className="mb-4 text-lg font-semibold text-ink">¿Qué especialidad necesitas?</legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {specialties.map((s) => (
              <OptionCard
                key={s.id}
                selected={specialtyId === s.id}
                onSelect={() => {
                  setSpecialtyId(s.id);
                  setServiceId(null);
                  setStartsAt(null);
                }}
                title={s.name}
                description={s.summary}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 1 && specialty ? (
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-4 text-lg font-semibold text-ink">Elige el servicio</legend>
            <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <OptionCard
                  key={s.id}
                  selected={serviceId === s.id}
                  onSelect={() => chooseService(s.id)}
                  title={s.name}
                  description={s.summary}
                  meta={`${s.durationMinutes} min${s.showPrice && s.price != null ? ` · ${formatGuaranies(s.price)}` : ""}`}
                />
              ))}
            </div>
          </fieldset>
          {serviceId ? (
            <fieldset>
              <legend className="mb-4 text-lg font-semibold text-ink">Elige el profesional</legend>
              <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availablePros.map((p) => (
                  <OptionCard
                    key={p.id}
                    selected={professionalId === p.id}
                    onSelect={() => {
                      setProfessionalId(p.id);
                      setStartsAt(null);
                    }}
                    title={p.name}
                    icon={<UserRound className="size-5" aria-hidden="true" />}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}
          {service?.preparationNotes ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Preparación: {service.preparationNotes}</p>
          ) : null}
        </div>
      ) : null}

      {step === 2 && serviceId && professionalId ? (
        <section aria-labelledby="horario-titulo">
          <h2 id="horario-titulo" className="mb-4 text-lg font-semibold text-ink">
            Elige fecha y horario
          </h2>
          <SlotPicker professionalId={professionalId} serviceId={serviceId} value={startsAt} onChange={(v) => {
              setStartsAt(v);
              setSelectedAt(Date.now());
            }}
          />
        </section>
      ) : null}

      {step === 3 && service && professional && startsAt ? (
        <ActionForm action={bookFromPortalAction} className="space-y-5">
          <input type="hidden" name="professionalId" value={professional.id} />
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="startsAt" value={startsAt} />
          <h2 className="text-lg font-semibold text-ink">Revisa y confirma tu cita</h2>
          <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
            <Summary icon={CalendarCheck} label="Fecha">
              <span className="first-letter:uppercase">{formatLongDate(startsAt)}</span>
            </Summary>
            <Summary icon={Clock} label="Hora">
              {formatTime(startsAt)} ({service.durationMinutes} min)
            </Summary>
            <Summary icon={Stethoscope} label="Servicio">
              {service.name}
            </Summary>
            <Summary icon={UserRound} label="Profesional">
              {professional.name}
            </Summary>
          </dl>
          <TextAreaField
            name="patientComment"
            label="Comentario para la secretaría"
            optionalLabel
            rows={2}
            maxLength={300}
            hint="Por ejemplo, si es tu primera consulta. No incluyas información médica sensible."
          />
          <p className="text-sm text-muted">{cancellationPolicy}</p>
          {new Date(startsAt).getTime() - selectedAt < cancelMinHours * 3600_000 ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="note">
              Este horario es dentro de las próximas {cancelMinHours} horas: si luego necesitas cancelarlo, deberás comunicarte con la secretaría.
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => setStep(2)} icon={<ArrowLeft className="size-4" aria-hidden="true" />}>
              Cambiar horario
            </Button>
            <SubmitButton size="lg" pendingLabel="Agendando…">
              <Check className="size-5" aria-hidden="true" /> Confirmar cita
            </SubmitButton>
          </div>
        </ActionForm>
      ) : null}

      {step < 3 ? (
        <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lift backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} icon={<ArrowLeft className="size-4" aria-hidden="true" />}>
              Atrás
            </Button>
          ) : null}
          <Button size="lg" className="flex-1 md:flex-none" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Continuar <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function OptionCard({
  selected,
  onSelect,
  title,
  description,
  meta,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  meta?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border bg-surface p-4 text-left transition-colors",
        selected ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-primary",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary bg-primary text-white" : "border-line-strong",
        )}
        aria-hidden="true"
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold text-ink">
          {icon}
          {title}
        </span>
        {description ? <span className="mt-0.5 block text-sm text-muted">{description}</span> : null}
        {meta ? <span className="mt-1 block text-xs font-medium text-primary">{meta}</span> : null}
      </span>
    </button>
  );
}

function Summary({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}
