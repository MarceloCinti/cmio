"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { addendumSchema, backgroundSchema, diagnosisSchema, encounterSchema, goalSchema, studyOrderSchema, vitalsSchema } from "@/lib/validation/clinical";
import {
  addAddendumAction,
  addDiagnosisAction,
  createGoalAction,
  saveBackgroundAction,
  saveEncounterAction,
  savePrescriptionAction,
  saveStudyOrderAction,
  saveVitalsAction,
} from "@/app/panel/consultas/actions";

type Background = {
  allergies?: string | null;
  currentMedications?: string | null;
  personalHistory?: string | null;
  familyHistory?: string | null;
  surgicalHistory?: string | null;
  habits?: string | null;
  notes?: string | null;
};

export function BackgroundForm({ patientId, values }: { patientId: string; values: Background | null }) {
  const v = (k: keyof Background) => values?.[k] ?? "";
  return (
    <ActionForm action={saveBackgroundAction} schema={backgroundSchema} className="space-y-4">
      <input type="hidden" name="patientId" value={patientId} />
      <TextAreaField name="allergies" label="Alergias informadas" rows={2} defaultValue={v("allergies")} hint="Una por línea. Escribe «Niega» si el paciente no refiere alergias." />
      <TextAreaField name="currentMedications" label="Medicamentos en uso informados" rows={2} defaultValue={v("currentMedications")} />
      <TextAreaField name="personalHistory" label="Antecedentes personales" rows={3} defaultValue={v("personalHistory")} />
      <TextAreaField name="familyHistory" label="Antecedentes familiares" rows={2} defaultValue={v("familyHistory")} />
      <TextAreaField name="surgicalHistory" label="Antecedentes quirúrgicos" rows={2} defaultValue={v("surgicalHistory")} />
      <TextAreaField name="habits" label="Hábitos (alimentación, actividad física, sueño, tabaco, alcohol)" rows={2} defaultValue={v("habits")} />
      <TextAreaField name="notes" label="Otras notas" rows={2} defaultValue={v("notes")} />
      <SubmitButton variant="secondary" pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar nueva versión
      </SubmitButton>
    </ActionForm>
  );
}

type EncounterValues = {
  reason: string;
  currentIllness: string | null;
  physicalExam: string | null;
  assessment: string | null;
  plan: string | null;
  followUpInstructions: string | null;
  patientInstructions: string | null;
  sharePatientInstructions: boolean;
  clinicalNotes: string | null;
  nextEvaluationDate: string | null;
};

export function EncounterForm({ encounterId, values }: { encounterId: string; values: EncounterValues }) {
  return (
    <ActionForm action={saveEncounterAction} schema={encounterSchema} className="space-y-5">
      <input type="hidden" name="encounterId" value={encounterId} />
      <TextField name="reason" label="Motivo de consulta" required defaultValue={values.reason} />
      <TextAreaField name="currentIllness" label="Historia de la enfermedad actual" rows={4} defaultValue={values.currentIllness ?? ""} />
      <TextAreaField name="physicalExam" label="Examen físico" rows={4} defaultValue={values.physicalExam ?? ""} />
      <TextAreaField name="assessment" label="Evaluación clínica" rows={4} defaultValue={values.assessment ?? ""} />
      <TextAreaField name="plan" label="Plan de atención" rows={4} defaultValue={values.plan ?? ""} />
      <TextAreaField name="followUpInstructions" label="Indicaciones de seguimiento (internas)" rows={3} defaultValue={values.followUpInstructions ?? ""} />
      <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
        <TextAreaField
          name="patientInstructions"
          label="Indicaciones para el paciente"
          rows={3}
          defaultValue={values.patientInstructions ?? ""}
          hint="Texto que el paciente podrá leer en su portal si habilitas la opción siguiente."
        />
        <CheckboxField name="sharePatientInstructions" defaultChecked={values.sharePatientInstructions} label="Compartir estas indicaciones en el portal del paciente al finalizar la consulta" />
      </div>
      <TextAreaField name="clinicalNotes" label="Notas clínicas" rows={3} defaultValue={values.clinicalNotes ?? ""} />
      <TextField name="nextEvaluationDate" label="Próxima evaluación sugerida" type="date" defaultValue={values.nextEvaluationDate ?? ""} optionalLabel wrapperClassName="sm:max-w-xs" />
      <SubmitButton variant="secondary" pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar borrador
      </SubmitButton>
    </ActionForm>
  );
}

type Vitals = Partial<Record<"weightKg" | "heightCm" | "waistCm" | "hipCm" | "bodyFatPct" | "systolic" | "diastolic" | "heartRate" | "respiratoryRate" | "temperatureC" | "spo2", string | number | null>>;

export function VitalsForm({ encounterId, values }: { encounterId: string; values: Vitals | null }) {
  const v = (k: keyof Vitals) => (values?.[k] ?? "") as string;
  const num = { type: "text", inputMode: "decimal" as const, autoComplete: "off" };
  return (
    <ActionForm action={saveVitalsAction} schema={vitalsSchema} className="space-y-4">
      <input type="hidden" name="encounterId" value={encounterId} />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="weightKg" label="Peso (kg)" {...num} defaultValue={v("weightKg")} />
        <TextField name="heightCm" label="Talla (cm)" {...num} defaultValue={v("heightCm")} />
        <TextField name="waistCm" label="Cintura (cm)" {...num} defaultValue={v("waistCm")} />
        <TextField name="hipCm" label="Cadera (cm)" {...num} defaultValue={v("hipCm")} />
        <TextField name="bodyFatPct" label="Grasa corporal (%)" {...num} defaultValue={v("bodyFatPct")} />
        <TextField name="spo2" label="SpO₂ (%)" {...num} inputMode="numeric" defaultValue={v("spo2")} />
        <TextField name="systolic" label="PA sistólica" {...num} inputMode="numeric" defaultValue={v("systolic")} />
        <TextField name="diastolic" label="PA diastólica" {...num} inputMode="numeric" defaultValue={v("diastolic")} />
        <TextField name="heartRate" label="Frec. cardíaca" {...num} inputMode="numeric" defaultValue={v("heartRate")} />
        <TextField name="respiratoryRate" label="Frec. respiratoria" {...num} inputMode="numeric" defaultValue={v("respiratoryRate")} />
        <TextField name="temperatureC" label="Temperatura (°C)" {...num} defaultValue={v("temperatureC")} />
      </div>
      <p className="text-xs text-muted">El IMC se calcula automáticamente a partir del peso y la talla.</p>
      <SubmitButton variant="outline" size="sm" pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar medidas
      </SubmitButton>
    </ActionForm>
  );
}

export function DiagnosisForm({ encounterId }: { encounterId: string }) {
  return (
    <ActionForm action={addDiagnosisAction} schema={diagnosisSchema} resetOnSuccess showSuccess={false} className="space-y-3">
      <input type="hidden" name="encounterId" value={encounterId} />
      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <TextField name="code" label="CIE-10" optionalLabel placeholder="E66.9" autoComplete="off" />
        <TextField name="description" label="Diagnóstico" required autoComplete="off" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField name="kind" label="Tipo" options={[{ value: "PRINCIPAL", label: "Principal" }, { value: "SECONDARY", label: "Secundario" }]} />
        <SelectField name="certainty" label="Certeza" options={[{ value: "PRESUMPTIVE", label: "Presuntivo" }, { value: "CONFIRMED", label: "Confirmado" }]} />
      </div>
      <SubmitButton variant="outline" size="sm" pendingLabel="Agregando…">
        <Plus className="size-4" aria-hidden="true" /> Agregar diagnóstico
      </SubmitButton>
    </ActionForm>
  );
}

type RxItem = { medication: string; dose: string | null; frequency: string | null; duration: string | null; quantity: string | null; instructions: string | null };

export function PrescriptionForm({ encounterId, items: initial, notes }: { encounterId: string; items: RxItem[]; notes: string | null }) {
  const blank: RxItem = { medication: "", dose: "", frequency: "", duration: "", quantity: "", instructions: "" };
  const [rows, setRows] = useState<RxItem[]>(initial.length ? initial : [blank]);
  return (
    <ActionForm action={savePrescriptionAction} className="space-y-4">
      <input type="hidden" name="encounterId" value={encounterId} />
      {rows.map((r, i) => (
        <fieldset key={i} className="space-y-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-semibold text-muted">Medicamento {i + 1}</legend>
          <TextField name="medication[]" label="Medicamento (nombre y presentación)" defaultValue={r.medication} required={i === 0} />
          <div className="grid grid-cols-2 gap-3">
            <TextField name="dose[]" label="Dosis" defaultValue={r.dose ?? ""} />
            <TextField name="frequency[]" label="Frecuencia" defaultValue={r.frequency ?? ""} />
            <TextField name="duration[]" label="Duración" defaultValue={r.duration ?? ""} />
            <TextField name="quantity[]" label="Cantidad" defaultValue={r.quantity ?? ""} />
          </div>
          <TextField name="instructions[]" label="Indicaciones" defaultValue={r.instructions ?? ""} />
          {rows.length > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} icon={<Trash2 className="size-4" aria-hidden="true" />}>
              Quitar
            </Button>
          ) : null}
        </fieldset>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setRows([...rows, blank])} icon={<Plus className="size-4" aria-hidden="true" />}>
        Agregar otro medicamento
      </Button>
      <TextAreaField name="notes" label="Observaciones de la receta" rows={2} defaultValue={notes ?? ""} optionalLabel />
      <SubmitButton variant="outline" size="sm" pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar receta (borrador)
      </SubmitButton>
    </ActionForm>
  );
}

export function StudyOrderForm({ encounterId, studies, indication, isUrgent }: { encounterId: string; studies: string[]; indication: string | null; isUrgent: boolean }) {
  return (
    <ActionForm action={saveStudyOrderAction} schema={studyOrderSchema} className="space-y-3">
      <input type="hidden" name="encounterId" value={encounterId} />
      <TextAreaField name="studies" label="Estudios solicitados" rows={4} defaultValue={studies.join("\n")} hint="Uno por línea." required />
      <TextAreaField name="indication" label="Indicación o diagnóstico presuntivo" rows={2} defaultValue={indication ?? ""} optionalLabel />
      <CheckboxField name="isUrgent" label="Urgente" defaultChecked={isUrgent} />
      <SubmitButton variant="outline" size="sm" pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar orden (borrador)
      </SubmitButton>
    </ActionForm>
  );
}

export function AddendumForm({ encounterId }: { encounterId: string }) {
  return (
    <ActionForm action={addAddendumAction} schema={addendumSchema} resetOnSuccess className="space-y-3">
      <input type="hidden" name="encounterId" value={encounterId} />
      <TextAreaField name="content" label="Contenido de la adenda" rows={4} required />
      <TextField name="reason" label="Motivo (por ejemplo, corrección o dato tardío)" optionalLabel />
      <SubmitButton variant="secondary" size="sm" pendingLabel="Registrando…">
        <Plus className="size-4" aria-hidden="true" /> Registrar adenda
      </SubmitButton>
    </ActionForm>
  );
}

export function GoalForm({ patientId }: { patientId: string }) {
  return (
    <ActionForm action={createGoalAction} schema={goalSchema} resetOnSuccess className="space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <TextField name="description" label="Objetivo" required />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          name="metric"
          label="Indicador"
          options={[
            { value: "WEIGHT", label: "Peso (kg)" },
            { value: "WAIST", label: "Cintura (cm)" },
            { value: "BMI", label: "IMC" },
            { value: "OTHER", label: "Otro" },
          ]}
        />
        <TextField name="targetValue" label="Valor objetivo" inputMode="decimal" optionalLabel />
      </div>
      <TextField name="targetDate" label="Fecha objetivo" type="date" optionalLabel />
      <CheckboxField name="visibleToPatient" defaultChecked label="Visible para el paciente en su portal (si el seguimiento está habilitado)" />
      <SubmitButton variant="outline" size="sm" pendingLabel="Guardando…">
        <Plus className="size-4" aria-hidden="true" /> Agregar objetivo
      </SubmitButton>
    </ActionForm>
  );
}
