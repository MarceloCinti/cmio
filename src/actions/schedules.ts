"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { requireStaff } from "@/server/auth/current";
import { createScheduleException, deleteScheduleException, replaceScheduleRules } from "@/server/services/schedules";

export async function saveRulesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const professionalId = String(fd.get("professionalId") ?? "");
  const obj = formDataToObject(fd);
  return runAction(async () => {
    const n = await replaceScheduleRules(actor, professionalId, {
      weekday: (obj.weekday as string[] | undefined) ?? [],
      start: (obj.start as string[] | undefined) ?? [],
      end: (obj.end as string[] | undefined) ?? [],
    });
    revalidatePath("/panel", "layout");
    return n;
  }, "Disponibilidad semanal guardada. Las citas ya agendadas no se modificaron.");
}

export async function createExceptionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  let affected = 0;
  const result = await runAction(async () => {
    affected = (await createScheduleException(actor, formDataToObject(fd))).affected;
    revalidatePath("/panel", "layout");
  });
  if (result?.ok) {
    return {
      ...result,
      message: affected
        ? `Bloqueo registrado. Atención: hay ${affected} cita(s) activa(s) en ese período que deben reprogramarse o cancelarse.`
        : "Bloqueo registrado. No hay citas afectadas.",
    };
  }
  return result;
}

export async function deleteExceptionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await deleteScheduleException(actor, String(fd.get("exceptionId") ?? ""));
    revalidatePath("/panel", "layout");
  }, "Bloqueo eliminado.");
}
