"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import type { ZodType } from "zod";
import { z } from "@/lib/validation/zod-es";
import type { ActionState, FieldErrors, FormAction } from "@/lib/action-state";
import { formDataToObject } from "@/lib/form-data";
import { cn } from "@/lib/cn";
import { Alert } from "./alert";
import { Button, type ButtonVariant } from "./button";

type FormCtx = { errors: FieldErrors; pending: boolean };
const FormContext = createContext<FormCtx>({ errors: {}, pending: false });

export function useFormCtx() {
  return useContext(FormContext);
}

function useFieldError(name?: string) {
  const { errors } = useFormCtx();
  if (!name) return undefined;
  const key = name.endsWith("[]") ? name.slice(0, -2) : name;
  return errors[key]?.[0];
}

type ActionFormProps<T> = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: FormAction<T>;
  schema?: ZodType;
  children: ReactNode;
  /** Muestra el mensaje de éxito devuelto por el servidor. */
  showSuccess?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: (state: Extract<ActionState<T>, { ok: true }>) => void;
};

/**
 * Formulario con validación en el cliente (mismo esquema que el servidor),
 * estados de carga y mensajes de error/éxito accesibles.
 */
export function ActionForm<T>({
  action,
  schema,
  children,
  className,
  showSuccess = true,
  resetOnSuccess,
  onSuccess,
  ...rest
}: ActionFormProps<T>) {
  const [state, formAction] = useActionState<ActionState<T>, FormData>(action, null);
  const [isPending, startTransition] = useTransition();
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandled = useRef<number | null>(null);

  useEffect(() => {
    if (!state || state.at === lastHandled.current) return;
    lastHandled.current = state.at;
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
    } else if (state.fieldErrors) {
      focusFirstInvalid(formRef.current, state.fieldErrors);
    }
  }, [state, resetOnSuccess, onSuccess]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(form, submitter ?? undefined);
    if (schema) {
      const result = schema.safeParse(formDataToObject(formData));
      if (!result.success) {
        const flat = z.flattenError(result.error);
        const errors = flat.fieldErrors as FieldErrors;
        setClientErrors(errors);
        setClientMessage(flat.formErrors[0] ?? "Revisa los datos marcados en el formulario.");
        focusFirstInvalid(form, errors);
        return;
      }
    }
    setClientErrors({});
    setClientMessage(null);
    startTransition(() => formAction(formData));
  }

  const serverErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errors = Object.keys(clientErrors).length ? clientErrors : serverErrors;
  const message = clientMessage ?? (state && !state.ok ? state.message : null);

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className={className} {...rest}>
      <FormContext.Provider value={{ errors, pending: isPending }}>
        {message ? (
          <Alert tone="error" live className="mb-4">
            {message}
          </Alert>
        ) : null}
        {showSuccess && state?.ok && state.message && !clientMessage ? (
          <Alert tone="success" live className="mb-4">
            {state.message}
          </Alert>
        ) : null}
        {children}
      </FormContext.Provider>
    </form>
  );
}

function focusFirstInvalid(form: HTMLFormElement | null, errors: FieldErrors) {
  if (!form) return;
  for (const name of Object.keys(errors)) {
    if (!errors[name]?.length) continue;
    const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"], [name="${CSS.escape(name)}[]"]`);
    if (el) {
      el.focus();
      return;
    }
  }
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingLabel,
  name,
  value,
  size,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormCtx();
  return (
    <Button type="submit" variant={variant} size={size} loading={pending} className={className} name={name} value={value}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────
// Campos
// ─────────────────────────────────────────────────────────────

export const inputClasses =
  "block w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink shadow-[inset_0_1px_1px_rgb(0_0_0/0.03)] " +
  "placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 " +
  "disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10 min-h-11";

type FieldShellProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: boolean;
  className?: string;
  children: ReactNode;
};

export function FieldShell({ id, label, hint, error, required, optionalLabel, className, children }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="text-red-700" aria-hidden="true">
            {" "}
            *
          </span>
        ) : optionalLabel ? (
          <span className="font-normal text-muted"> (opcional)</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  optionalLabel?: boolean;
  wrapperClassName?: string;
  error?: string;
};

export function TextField({
  name,
  label,
  hint,
  required,
  optionalLabel,
  wrapperClassName,
  className,
  error: errorProp,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const contextError = useFieldError(name);
  const error = errorProp ?? contextError;
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      className={wrapperClassName}
    >
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputClasses, className)}
        {...rest}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id"> & {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  optionalLabel?: boolean;
  wrapperClassName?: string;
};

export function TextAreaField({
  name,
  label,
  hint,
  required,
  optionalLabel,
  wrapperClassName,
  className,
  rows = 4,
  ...rest
}: TextAreaFieldProps) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      className={wrapperClassName}
    >
      <textarea
        id={id}
        name={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputClasses, "min-h-24 leading-relaxed", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export type Option = { value: string; label: string; disabled?: boolean };

type SelectFieldProps = Omit<ComponentProps<"select">, "id"> & {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  options: Option[];
  placeholder?: string;
  optionalLabel?: boolean;
  wrapperClassName?: string;
};

export function SelectField({
  name,
  label,
  hint,
  options,
  placeholder,
  required,
  optionalLabel,
  wrapperClassName,
  className,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      className={wrapperClassName}
    >
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputClasses, "appearance-none bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2355676c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type CheckboxFieldProps = Omit<ComponentProps<"input">, "id" | "type"> & {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  wrapperClassName?: string;
};

export function CheckboxField({ name, label, hint, wrapperClassName, ...rest }: CheckboxFieldProps) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div className={cn("space-y-1", wrapperClassName)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-line-strong accent-[var(--brand-primary)]"
          {...rest}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-ink">
          {label}
        </label>
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="pl-8 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="pl-8 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Mensaje de error general de un grupo de campos (por ejemplo, casillas múltiples). */
export function FieldError({ name }: { name: string }) {
  const error = useFieldError(name);
  if (!error) return null;
  return <p className="text-sm font-medium text-red-700">{error}</p>;
}
