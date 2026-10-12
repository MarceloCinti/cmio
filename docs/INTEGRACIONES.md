# Integraciones

Principio general: **ninguna integración se simula**. Si faltan credenciales o el canal está
desactivado, el mensaje queda registrado como **No enviado** con el motivo, visible en
**Panel → Mensajes**. El estado de cada integración se ve en **Panel → Configuración**.

## Correo electrónico (SMTP)

Se usa para: verificación de cuenta, recuperación de contraseña, invitaciones, confirmaciones,
cambios y recordatorios de citas, avisos de documentos disponibles y avisos administrativos.

| Variable | Descripción |
|---|---|
| `EMAIL_DRIVER` | `smtp` (envío real), `file` (solo desarrollo: guarda `.eml` en `.data/mail`), `disabled` |
| `EMAIL_FROM` | Remitente, por ejemplo `CMIO <no-responder@cmio.com.py>` |
| `SMTP_HOST`, `SMTP_PORT` | Servidor y puerto (587 con STARTTLS o 465 con TLS) |
| `SMTP_SECURE` | `true` para el puerto 465 |
| `SMTP_USER`, `SMTP_PASSWORD` | Credenciales |

Recomendaciones:

- Usa un proveedor transaccional (por ejemplo Amazon SES, Brevo, Postmark o el SMTP del
  dominio) y configura **SPF, DKIM y DMARC** del dominio remitente.
- El registro de pacientes en línea solo se habilita cuando el correo está configurado
  (sin él no se pueden verificar las cuentas).
- Prueba el envío con "¿Olvidaste tu contraseña?" desde una cuenta propia.

Contenido: las plantillas (Panel → Mensajes → Plantillas) solo pueden contener datos
administrativos; el sistema rechaza textos con referencias a diagnósticos o tratamientos.
Las plantillas de seguridad (verificación, recuperación e invitación) son fijas.

## WhatsApp Business (Cloud API de Meta)

Solo se usa la **API oficial** de Meta con **plantillas aprobadas**. No hay automatización de
WhatsApp Web ni servicios no oficiales.

### Requisitos previos (los gestiona la clínica)

1. Cuenta de Meta Business verificada y una cuenta de WhatsApp Business Platform.
2. Un número de teléfono dedicado registrado en la plataforma (no puede usarse a la vez en la
   aplicación de WhatsApp del teléfono).
3. Un **token de acceso permanente** de un usuario del sistema con permiso
   `whatsapp_business_messaging`.
4. Plantillas creadas y **aprobadas** por Meta (categoría *Utility*), idioma **Español (`es`)**,
   con los nombres y parámetros de la tabla siguiente.

### Plantillas y orden de parámetros

Los parámetros `{{1}}`, `{{2}}`, … se completan en este orden (definido en
`WHATSAPP_PARAM_ORDER`, `src/lib/message-templates.ts`):

| Evento | Nombre de plantilla | Parámetros |
|---|---|---|
| Cita agendada | `cmio_cita_agendada` | 1 nombre, 2 fecha, 3 hora, 4 profesional |
| Cita confirmada | `cmio_cita_confirmada` | 1 nombre, 2 fecha, 3 hora, 4 profesional |
| Cita reprogramada | `cmio_cita_reprogramada` | 1 nombre, 2 fecha, 3 hora, 4 profesional |
| Cita cancelada | `cmio_cita_cancelada` | 1 nombre, 2 fecha, 3 hora |
| Recordatorio | `cmio_recordatorio_cita` | 1 nombre, 2 fecha, 3 hora, 4 profesional, 5 dirección |
| Documento disponible | `cmio_documento_disponible` | 1 nombre |
| Aviso administrativo | `cmio_aviso_administrativo` | 1 nombre, 2 mensaje |

Texto sugerido para someter a aprobación (ejemplo del recordatorio):

> Hola, {{1}}. Te recordamos tu cita del {{2}} a las {{3}} con {{4}} en {{5}}. Si necesitas
> reprogramarla, ingresa al portal del paciente o comunícate con la clínica.

Si Meta aprueba la plantilla con otro nombre, actualízalo en Panel → Mensajes → Plantillas
(campo "Nombre de la plantilla aprobada en Meta").

### Variables de entorno

| Variable | Descripción |
|---|---|
| `WHATSAPP_PROVIDER` | `meta` para habilitar, `disabled` para no enviar |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número (no el número en sí) |
| `WHATSAPP_ACCESS_TOKEN` | Token permanente |
| `WHATSAPP_API_VERSION` | Versión de Graph API (por defecto `v21.0`; actualízala según el calendario de Meta) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Texto aleatorio que defines tú (para verificar el webhook) |
| `WHATSAPP_APP_SECRET` | *App secret* de la aplicación de Meta (para validar firmas) |

Además, activa el canal en **Panel → Configuración → Notificaciones**.

### Webhook de estados de entrega

URL: `https://TU-DOMINIO/api/webhooks/whatsapp`, suscrita al campo `messages`.

- **GET**: Meta verifica la suscripción con `hub.verify_token`; debe coincidir con
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- **POST**: cada notificación se valida con la firma `X-Hub-Signature-256` (HMAC-SHA256 del
  cuerpo con `WHATSAPP_APP_SECRET`). Las notificaciones sin firma válida se rechazan.
- Los estados `sent`, `delivered`, `read` y `failed` se muestran en Panel → Mensajes; un
  `failed` marca el mensaje como fallido con el motivo informado por Meta.

### Consentimiento y números

- Solo se envía WhatsApp a pacientes con **consentimiento vigente** para ese canal (se registra
  en el registro o desde la ficha, con historial inmutable).
- Los números se normalizan al formato internacional de Paraguay (`595…`). Los números que no
  se pueden interpretar quedan como "Número de teléfono inválido".
- Los mensajes nunca incluyen información clínica.

## Almacenamiento de archivos

| Variable | Descripción |
|---|---|
| `STORAGE_DRIVER` | `local` (único disponible actualmente) |
| `STORAGE_LOCAL_PATH` | Carpeta privada (en Docker: `/data/storage`, volumen `storage`) |

- Tipos permitidos: PDF, JPG, PNG y WebP, validados por su contenido real (firma del archivo).
- Tamaño máximo: 10 MB para documentos clínicos y 5 MB para imágenes del sitio.
- Cada archivo guarda su SHA-256. Las descargas de documentos clínicos se autorizan y
  auditan una por una.
- Para almacenamiento compatible con S3, ver [MODULOS-FUTUROS.md](MODULOS-FUTUROS.md).

## Tarea periódica (`/api/cron`)

- Método `GET` o `POST` con `Authorization: Bearer <CRON_SECRET>` (mínimo 32 caracteres).
- Frecuencia recomendada: cada 5 minutos.
- Respuesta: cantidad de recordatorios encolados y mensajes procesados.
- Sin `CRON_SECRET` configurado responde 503 y no ejecuta nada.

## Mapa

La ubicación usa un mapa embebido que se carga **solo cuando la persona lo solicita** (sin
cookies de terceros antes de ese momento). Configura la búsqueda o las coordenadas exactas en
Panel → Contenido → Institución; mientras no estén verificadas se muestran como provisionales.
