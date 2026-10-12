"use client";

import { Save } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { PERMISSION_GROUPS, PERMISSIONS, ROLE_PERMISSION_CEILING, type ConfigurableRole } from "@/lib/permissions";
import { saveRolePermissionsAction } from "@/app/panel/admin-actions";

export function RolePermissionsForm({ role, granted }: { role: ConfigurableRole; granted: string[] }) {
  const ceiling = new Set<string>(ROLE_PERMISSION_CEILING[role]);
  return (
    <ActionForm action={saveRolePermissionsAction} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      {PERMISSION_GROUPS.map((g) => {
        const perms = g.permissions.filter((p) => ceiling.has(p));
        if (!perms.length) return null;
        return (
          <fieldset key={g.title} className="space-y-2">
            <legend className="text-sm font-semibold text-ink">{g.title}</legend>
            {perms.map((p) => (
              <label key={p} className="flex items-start gap-3 text-sm text-ink">
                <input type="checkbox" name="permissions[]" value={p} defaultChecked={granted.includes(p)} className="mt-0.5 size-5 shrink-0 accent-[var(--brand-primary)]" />
                {PERMISSIONS[p]}
              </label>
            ))}
          </fieldset>
        );
      })}
      <SubmitButton variant="secondary" pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar permisos
      </SubmitButton>
    </ActionForm>
  );
}
