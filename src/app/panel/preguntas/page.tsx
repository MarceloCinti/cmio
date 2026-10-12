import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FaqForm } from "@/components/catalog/catalog-forms";
import { requirePermission } from "@/server/auth/current";
import { listFaqsAdmin } from "@/server/services/catalog";
import { deleteFaqAction } from "../admin-actions";

export const metadata = { title: "Preguntas frecuentes" };

export default async function FaqAdminPage() {
  const actor = await requirePermission("contenido.gestionar");
  const items = await listFaqsAdmin(actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Preguntas frecuentes" description="Los cambios se publican al guardar." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={`Preguntas (${items.length})`} />
          <ul className="divide-y divide-line">
            {items.map((f) => (
              <li key={f.id} className="px-5 py-4">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="font-medium text-ink">{f.question}</span>
                    {f.isPublished ? <Badge tone="success">Publicada</Badge> : <Badge>Oculta</Badge>}
                  </summary>
                  <div className="mt-4 space-y-3">
                    <FaqForm f={f} />
                    <ConfirmAction action={deleteFaqAction} fields={{ id: f.id }} title="Eliminar pregunta" description="La pregunta dejará de mostrarse." confirmLabel="Eliminar" triggerLabel="Eliminar" destructive />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Nueva pregunta" />
          <CardBody>
            <FaqForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
