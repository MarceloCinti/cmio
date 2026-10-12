export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState<T = unknown> =
  | { ok: true; message?: string; data?: T; at: number }
  | { ok: false; message: string; fieldErrors?: FieldErrors; at: number }
  | null;

export type FormAction<T = unknown> = (prev: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
