import { CheckCircle2, CircleAlert } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingPolicyForm, NotificationSettingsForm } from "@/components/panel/settings-forms";
import { requirePermission } from "@/server/auth/current";
import { getSystemSetting } from "@/server/services/settings";
import { lastCronRun } from "@/server/services/maintenance";
import { emailStatus } from "@/server/integrations/email";
import { whatsappStatus } from "@/server/integrations/whatsapp";
import { storageStatus } from "@/server/integrations/storage";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  await requirePermission("configuracion.gestionar");
  const [booking, notifications, cron] = await Promise.all([getSystemSetting("booking"), getSystemSetting("notifications"), lastCronRun()]);
  const email = emailStatus();
  const wa = whatsappStatus();
  const storage = storageStatus();
  const cronOk = cron && Date.now() - new Date(cron.at).getTime() < 60 * 60 * 1000;
  const integrations = [
    {
      name: "Correo electrónico",
      ok: email.configured && email.driver === "smtp",
      state: email.driver === "smtp" ? (email.configured ? "Configurado" : "Incompleto") : email.driver === "file" ? "Modo desarrollo" : "No configurado",
      detail: email.detail,
      help: "Variables EMAIL_DRIVER=smtp, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y EMAIL_FROM (ver docs/INTEGRACIONES.md).",
    },
    {
      name: "WhatsApp Business (API oficial de Meta)",
      ok: wa.configured,
      state: wa.configured ? "Configurado" : "Pendiente",
      detail: wa.detail,
      help: "Requiere una cuenta de WhatsApp Business verificada, plantillas aprobadas por Meta y las variables WHATSAPP_*. Mientras tanto no se envía nada y cada intento queda registrado como «No enviado».",
    },
    { name: "Almacenamiento de archivos", ok: true, state: "Activo", detail: storage.detail, help: "Para servidores sin disco persistente, ver docs/DESPLIEGUE.md." },
    {
      name: "Tarea programada (recordatorios)",
      ok: Boolean(cronOk),
      state: cron ? `Última ejecución: ${formatDateTime(cron.at)}` : "Sin ejecuciones registradas",
      detail: cron ? `${cron.reminders} recordatorio(s) encolados, ${cron.sent} enviado(s), ${cron.failed} fallido(s) en la última ejecución.` : "Configura una llamada periódica a /api/cron.",
      help: "Programar cada 10 minutos: curl -H \"Authorization: Bearer $CRON_SECRET\" https://<dominio>/api/cron",
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Parámetros operativos. Estos ajustes están separados del contenido del sitio." />
      <Card>
        <CardHeader title="Estado de las integraciones" description="Las integraciones no configuradas nunca simulan envíos." />
        <ul className="divide-y divide-line">
          {integrations.map((i) => (
            <li key={i.name} className="flex gap-3 px-5 py-4">
              {i.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />}
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  {i.name} <Badge tone={i.ok ? "success" : "warning"}>{i.state}</Badge>
                </p>
                <p className="text-sm text-muted">{i.detail}</p>
                {!i.ok ? <p className="mt-1 text-xs text-muted">{i.help}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Políticas de agenda" description="Se aplican a las acciones de los pacientes en el portal. La secretaría puede gestionar excepciones." />
          <CardBody>
            <BookingPolicyForm v={booking} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Notificaciones" />
            <CardBody>
              <NotificationSettingsForm v={notifications} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Módulos futuros" />
            <CardBody className="space-y-2 text-sm text-muted">
              <p>
                <strong className="text-ink">Caja, pagos y facturación:</strong> no habilitado en esta versión. La arquitectura está preparada para incorporarlo (ver docs/MODULOS-FUTUROS.md).
              </p>
              <p>
                <strong className="text-ink">Teleconsultas, laboratorios externos, inventario y encuestas:</strong> previstos para etapas posteriores.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
