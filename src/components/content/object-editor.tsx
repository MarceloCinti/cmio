"use client";

import { useState, type ReactNode } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { ZodType } from "zod";
import { z } from "@/lib/validation/zod-es";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { inputClasses } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { ImagePicker } from "./image-picker";
import { saveContentDraftAction } from "@/app/panel/admin-actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type FieldDesc = {
  key: string;
  label: string;
  type: "text" | "textarea" | "checkbox" | "color" | "image" | "number" | "select" | "list" | "group";
  hint?: string;
  rows?: number;
  options?: { value: string; label: string }[];
  /** Para "image": clave hermana donde guardar el texto alternativo sugerido. */
  altKey?: string;
  fields?: FieldDesc[];
  itemLabel?: string;
  newItem?: Record<string, unknown>;
  maxItems?: number;
};

type Obj = Record<string, unknown>;

function setIn(obj: Obj, path: (string | number)[], value: unknown): Obj {
  const [head, ...rest] = path;
  const clone: Obj | unknown[] = Array.isArray(obj) ? [...obj] : { ...obj };
  (clone as Record<string | number, unknown>)[head] = rest.length ? setIn(((obj as Record<string | number, unknown>)[head] ?? {}) as Obj, rest, value) : value;
  return clone as Obj;
}

export function ObjectEditor({ contentKey, initial, fields, schema, extra }: { contentKey: string; initial: Obj; fields: FieldDesc[]; schema: ZodType; extra?: (value: Obj) => ReactNode }) {
  const [value, setValue] = useState<Obj>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const update = (path: (string | number)[], v: unknown) => setValue((prev) => setIn(prev, path, v));

  function save() {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      setMessage("Revisa los campos marcados antes de guardar.");
      return;
    }
    setErrors({});
    setMessage(null);
    const fd = new FormData();
    fd.set("key", contentKey);
    fd.set("payload", JSON.stringify(parsed.data));
    start(async () => {
      const res = await saveContentDraftAction(null, fd);
      if (res?.ok) {
        toast(res.message ?? "Borrador guardado.");
        router.refresh();
      } else if (res) setMessage(res.message);
    });
  }

  return (
    <div className="space-y-5">
      {message ? (
        <Alert tone="error" live>
          {message}
          {Object.keys(errors).length ? (
            <ul className="mt-1 list-disc pl-5">
              {Object.entries(errors)
                .slice(0, 6)
                .map(([k, v]) => (
                  <li key={k}>{v}</li>
                ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}
      <Fields fields={fields} value={value} path={[]} update={update} errors={errors} />
      {extra ? extra(value) : null}
      <div className="sticky bottom-16 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lift backdrop-blur lg:bottom-4">
        <Button onClick={save} loading={pending} icon={<Save className="size-4" aria-hidden="true" />}>
          Guardar borrador
        </Button>
        <p className="text-xs text-muted">Los cambios no se ven en el sitio hasta que los publiques.</p>
      </div>
    </div>
  );
}

function Fields({
  fields,
  value,
  path,
  update,
  errors,
}: {
  fields: FieldDesc[];
  value: Obj;
  path: (string | number)[];
  update: (p: (string | number)[], v: unknown) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const p = [...path, f.key];
        const id = `f-${p.join("-")}`;
        const err = errors[p.join(".")];
        const v = value?.[f.key];
        const label = (
          <label htmlFor={id} className="block text-sm font-medium text-ink">
            {f.label}
          </label>
        );
        const hint = err ? <p className="text-sm font-medium text-red-700">{err}</p> : f.hint ? <p className="text-xs text-muted">{f.hint}</p> : null;
        switch (f.type) {
          case "text":
          case "number":
            return (
              <div key={f.key} className="space-y-1.5">
                {label}
                <input
                  id={id}
                  type="text"
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  className={inputClasses}
                  aria-invalid={err ? true : undefined}
                  value={v === null || v === undefined ? "" : String(v)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    update(p, f.type === "number" ? (raw.trim() === "" ? null : Number(raw.replace(",", "."))) : raw);
                  }}
                />
                {hint}
              </div>
            );
          case "textarea":
            return (
              <div key={f.key} className="space-y-1.5">
                {label}
                <textarea id={id} rows={f.rows ?? 4} className={cn(inputClasses, "leading-relaxed")} aria-invalid={err ? true : undefined} value={String(v ?? "")} onChange={(e) => update(p, e.target.value)} />
                {hint}
              </div>
            );
          case "checkbox":
            return (
              <div key={f.key} className="space-y-1">
                <label className="flex items-start gap-3 text-sm text-ink">
                  <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--brand-primary)]" checked={Boolean(v)} onChange={(e) => update(p, e.target.checked)} />
                  {f.label}
                </label>
                {hint}
              </div>
            );
          case "color":
            return (
              <div key={f.key} className="space-y-1.5">
                {label}
                <div className="flex items-center gap-2">
                  <input type="color" aria-label={f.label} value={String(v ?? "#000000")} onChange={(e) => update(p, e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-line-strong bg-surface p-1" />
                  <input id={id} className={cn(inputClasses, "w-32 font-mono")} value={String(v ?? "")} onChange={(e) => update(p, e.target.value)} />
                </div>
                {hint}
              </div>
            );
          case "select":
            return (
              <div key={f.key} className="space-y-1.5">
                {label}
                <select id={id} className={inputClasses} value={String(v ?? "")} onChange={(e) => update(p, e.target.value)}>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {hint}
              </div>
            );
          case "image":
            return (
              <div key={f.key}>
                <ImagePicker
                  label={f.label}
                  value={(v as string) || null}
                  onChange={(path2, alt) => {
                    update(p, path2 ?? (f.key === "logoPath" ? null : ""));
                    if (alt && f.altKey) update([...path, f.altKey], alt);
                  }}
                />
                {hint}
              </div>
            );
          case "group":
            return (
              <fieldset key={f.key} className="space-y-4 rounded-2xl border border-line bg-surface p-4">
                <legend className="px-1 text-sm font-semibold text-ink">{f.label}</legend>
                <Fields fields={f.fields ?? []} value={(v as Obj) ?? {}} path={p} update={update} errors={errors} />
              </fieldset>
            );
          case "list": {
            const items = (Array.isArray(v) ? v : []) as Obj[];
            return (
              <fieldset key={f.key} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
                <legend className="px-1 text-sm font-semibold text-ink">{f.label}</legend>
                {hint}
                {items.map((item, i) => (
                  <div key={i} className="space-y-3 rounded-xl border border-line bg-canvas p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted">
                        {f.itemLabel ?? "Elemento"} {i + 1}
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => update(p, items.filter((_, j) => j !== i))} icon={<Trash2 className="size-4" aria-hidden="true" />}>
                        Quitar
                      </Button>
                    </div>
                    <Fields fields={f.fields ?? []} value={item} path={[...p, i]} update={update} errors={errors} />
                  </div>
                ))}
                {!f.maxItems || items.length < f.maxItems ? (
                  <Button variant="ghost" size="sm" onClick={() => update(p, [...items, { ...(f.newItem ?? {}) }])} icon={<Plus className="size-4" aria-hidden="true" />}>
                    Agregar {f.itemLabel?.toLowerCase() ?? "elemento"}
                  </Button>
                ) : null}
              </fieldset>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

export { z };
