"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { ActionForm, CheckboxField, FieldError, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { ImagePicker } from "@/components/content/image-picker";
import { faqSchema, professionalSchema, serviceSchema, specialtySchema } from "@/lib/validation/catalog";
import { SERVICE_CATEGORY_LABELS } from "@/lib/labels";
import { saveFaqAction, saveProfessionalAction, saveServiceAction, saveSpecialtyAction } from "@/app/panel/admin-actions";

function ImageField({ name, altName, label, initial, initialAlt }: { name: string; altName?: string; label: string; initial: string | null; initialAlt?: string | null }) {
  const [path, setPath] = useState<string | null>(initial);
  const [alt, setAlt] = useState(initialAlt ?? "");
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={path ?? ""} />
      <ImagePicker
        label={label}
        value={path}
        onChange={(p, a) => {
          setPath(p);
          if (a) setAlt(a);
        }}
      />
      {altName ? <TextField name={altName} label="Descripción de la imagen (texto alternativo)" value={alt} onChange={(e) => setAlt(e.target.value)} optionalLabel /> : null}
    </div>
  );
}

type Specialty = { id: string; name: string; summary: string; description: string | null; imagePath: string | null; imageAlt: string | null; isPublished: boolean; sortOrder: number };

export function SpecialtyForm({ s }: { s?: Specialty }) {
  return (
    <ActionForm action={saveSpecialtyAction} schema={specialtySchema} resetOnSuccess={!s} className="space-y-4">
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <TextField name="name" label="Nombre" required defaultValue={s?.name} />
        <TextField name="sortOrder" label="Orden" inputMode="numeric" defaultValue={String(s?.sortOrder ?? 0)} />
      </div>
      <TextField name="summary" label="Descripción breve" required defaultValue={s?.summary} />
      <TextAreaField name="description" label="Descripción" rows={3} defaultValue={s?.description ?? ""} optionalLabel />
      <ImageField name="imagePath" altName="imageAlt" label="Imagen ilustrativa" initial={s?.imagePath ?? null} initialAlt={s?.imageAlt} />
      <CheckboxField name="isPublished" defaultChecked={s?.isPublished ?? true} label="Visible en el sitio" />
      <SubmitButton pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> {s ? "Guardar cambios" : "Crear especialidad"}
      </SubmitButton>
    </ActionForm>
  );
}

type Service = {
  id: string;
  name: string;
  summary: string;
  description: string | null;
  category: string;
  specialtyId: string | null;
  durationMinutes: number;
  price: number | null;
  showPrice: boolean;
  availabilityConfirmed: boolean;
  isPublished: boolean;
  bookableOnline: boolean;
  capacityPerSlot: number;
  preparationNotes: string | null;
  imagePath: string | null;
  imageAlt: string | null;
  sortOrder: number;
};

export function ServiceForm({ s, specialties }: { s?: Service; specialties: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveServiceAction} schema={serviceSchema} resetOnSuccess={!s} className="space-y-4">
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField name="name" label="Nombre" required defaultValue={s?.name} />
        <SelectField name="category" label="Categoría" defaultValue={s?.category ?? "CONSULTATION"} options={Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
      </div>
      <TextField name="summary" label="Descripción breve" required defaultValue={s?.summary} />
      <TextAreaField name="description" label="Descripción" rows={2} defaultValue={s?.description ?? ""} optionalLabel />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SelectField name="specialtyId" label="Especialidad" defaultValue={s?.specialtyId ?? ""} placeholder="Ninguna" options={specialties.map((x) => ({ value: x.id, label: x.name }))} />
        <TextField name="durationMinutes" label="Duración (min)" inputMode="numeric" required defaultValue={String(s?.durationMinutes ?? 30)} />
        <TextField name="capacityPerSlot" label="Pacientes por turno" inputMode="numeric" defaultValue={String(s?.capacityPerSlot ?? 1)} hint="1 = turno exclusivo" />
        <TextField name="sortOrder" label="Orden" inputMode="numeric" defaultValue={String(s?.sortOrder ?? 0)} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField name="price" label="Precio (Gs.)" inputMode="numeric" defaultValue={s?.price != null ? String(s.price) : ""} optionalLabel />
        <CheckboxField name="showPrice" defaultChecked={s?.showPrice} label="Mostrar el precio en el sitio" wrapperClassName="sm:pt-8" />
      </div>
      <TextAreaField name="preparationNotes" label="Indicaciones de preparación" rows={2} defaultValue={s?.preparationNotes ?? ""} optionalLabel hint="Por ejemplo, ayuno. Solo si la clínica lo confirmó." />
      <ImageField name="imagePath" altName="imageAlt" label="Imagen ilustrativa" initial={s?.imagePath ?? null} initialAlt={s?.imageAlt} />
      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Disponibilidad</legend>
        <CheckboxField name="availabilityConfirmed" defaultChecked={s?.availabilityConfirmed} label="Confirmo que la clínica ofrece este servicio" />
        <CheckboxField name="isPublished" defaultChecked={s?.isPublished} label="Publicar en el sitio" />
        <CheckboxField name="bookableOnline" defaultChecked={s?.bookableOnline} label="Permitir reservas en línea desde el portal" />
        <FieldError name="availabilityConfirmed" />
        <FieldError name="bookableOnline" />
      </fieldset>
      <SubmitButton pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> {s ? "Guardar cambios" : "Crear servicio"}
      </SubmitButton>
    </ActionForm>
  );
}

type Professional = {
  id: string;
  honorific: string | null;
  firstName: string;
  lastName: string;
  licenseNumber: string | null;
  credentials: string | null;
  credentialsVerified: boolean;
  bio: string | null;
  photoPath: string | null;
  status: string;
  isPublished: boolean;
  acceptsOnlineBooking: boolean;
  agendaColor: string | null;
  sortOrder: number;
  specialtyIds: string[];
  serviceIds: string[];
  userId: string | null;
};

export function ProfessionalForm({
  p,
  specialties,
  services,
  users,
}: {
  p?: Professional;
  specialties: { id: string; name: string }[];
  services: { id: string; name: string; confirmed: boolean }[];
  users: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={saveProfessionalAction} schema={professionalSchema} className="space-y-5">
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <legend className="px-1 text-base font-semibold text-ink">Datos del profesional</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[8rem_1fr_1fr]">
          <TextField name="honorific" label="Tratamiento" placeholder="Dr., Dra., Lic." defaultValue={p?.honorific ?? ""} optionalLabel />
          <TextField name="firstName" label="Nombre" required defaultValue={p?.firstName} />
          <TextField name="lastName" label="Apellido" required defaultValue={p?.lastName} />
        </div>
        <TextAreaField name="bio" label="Descripción profesional" rows={4} defaultValue={p?.bio ?? ""} optionalLabel hint="Se muestra en el sitio. No incluyas información no verificada." />
        <ImageField name="photoPath" label="Fotografía (solo si el profesional la autorizó)" initial={p?.photoPath ?? null} />
      </fieldset>
      <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <legend className="px-1 text-base font-semibold text-ink">Formación y credenciales</legend>
        <TextField name="licenseNumber" label="Registro profesional (matrícula)" defaultValue={p?.licenseNumber ?? ""} optionalLabel />
        <TextAreaField name="credentials" label="Formación" rows={3} defaultValue={p?.credentials ?? ""} optionalLabel />
        <CheckboxField
          name="credentialsVerified"
          defaultChecked={p?.credentialsVerified}
          label="Verifiqué la matrícula y la formación con documentación del profesional"
          hint="Solo las credenciales verificadas se muestran en el sitio y en los documentos impresos."
        />
      </fieldset>
      <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <legend className="px-1 text-base font-semibold text-ink">Especialidades y servicios</legend>
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Especialidades</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {specialties.map((s) => (
              <CheckboxField key={s.id} name="specialtyIds[]" value={s.id} defaultChecked={p?.specialtyIds.includes(s.id)} label={s.name} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Servicios que ofrece</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <CheckboxField key={s.id} name="serviceIds[]" value={s.id} defaultChecked={p?.serviceIds.includes(s.id)} label={`${s.name}${s.confirmed ? "" : " (pendiente de confirmación)"}`} />
            ))}
          </div>
        </div>
      </fieldset>
      <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <legend className="px-1 text-base font-semibold text-ink">Estado y acceso</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            name="status"
            label="Estado del perfil"
            defaultValue={p?.status ?? "DRAFT"}
            options={[
              { value: "DRAFT", label: "Pendiente de completar" },
              { value: "ACTIVE", label: "Activo (atiende)" },
              { value: "INACTIVE", label: "Inactivo" },
            ]}
          />
          <SelectField name="userId" label="Cuenta de acceso" defaultValue={p?.userId ?? ""} placeholder="Sin cuenta vinculada" options={users.map((u) => ({ value: u.id, label: u.label }))} hint="Habilita su panel y la historia clínica." />
          <TextField name="sortOrder" label="Orden en el sitio" inputMode="numeric" defaultValue={String(p?.sortOrder ?? 0)} />
        </div>
        <CheckboxField name="acceptsOnlineBooking" defaultChecked={p?.acceptsOnlineBooking ?? true} label="Recibe reservas en línea desde el portal" />
        <CheckboxField name="isPublished" defaultChecked={p?.isPublished} label="Publicar el perfil en el sitio (requiere perfil activo, especialidad y descripción)" />
        <FieldError name="isPublished" />
        <input type="hidden" name="agendaColor" value={p?.agendaColor ?? ""} />
      </fieldset>
      <SubmitButton size="lg" pendingLabel="Guardando…">
        <Save className="size-5" aria-hidden="true" /> {p ? "Guardar cambios" : "Crear perfil"}
      </SubmitButton>
    </ActionForm>
  );
}

export function FaqForm({ f }: { f?: { id: string; question: string; answer: string; sortOrder: number; isPublished: boolean } }) {
  return (
    <ActionForm action={saveFaqAction} schema={faqSchema} resetOnSuccess={!f} className="space-y-3">
      {f ? <input type="hidden" name="id" value={f.id} /> : null}
      <TextField name="question" label="Pregunta" required defaultValue={f?.question} />
      <TextAreaField name="answer" label="Respuesta" required rows={4} defaultValue={f?.answer} />
      <div className="flex flex-wrap items-end gap-4">
        <TextField name="sortOrder" label="Orden" inputMode="numeric" defaultValue={String(f?.sortOrder ?? 0)} wrapperClassName="w-28" />
        <CheckboxField name="isPublished" defaultChecked={f?.isPublished ?? true} label="Publicada" />
      </div>
      <SubmitButton variant={f ? "outline" : "primary"} size="sm" pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> {f ? "Guardar" : "Agregar pregunta"}
      </SubmitButton>
    </ActionForm>
  );
}
