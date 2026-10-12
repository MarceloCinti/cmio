# Arquitectura

## Visión general

Aplicación única de Next.js 16 (App Router) que sirve:

- **Sitio público** (`src/app/(sitio)`): portada, la clínica, especialidades, servicios,
  profesionales, preguntas frecuentes, contacto, solicitud de cita, páginas legales,
  créditos de imágenes y verificación pública de documentos emitidos.
- **Autenticación** (`src/app/(auth)`): ingreso, registro de pacientes, verificación de
  correo, recuperación de contraseña y aceptación de invitaciones del personal.
- **Portal del paciente** (`src/app/portal`): inicio, citas (agendar, confirmar, cancelar,
  reprogramar), documentos publicados, seguimiento, perfil y notificaciones.
- **Panel del personal** (`src/app/panel`): agenda, recepción, pacientes, historia clínica,
  consultas, disponibilidad, solicitudes, catálogo, contenido, usuarios, roles,
  configuración, mensajes, auditoría e informes. Lo que cada persona ve depende de su rol
  y permisos.
- **Rutas de API** (`src/app/api`): descarga protegida de documentos, exportación CSV,
  tarea periódica (`/api/cron`), estado (`/api/salud`) y webhook de WhatsApp.
- **Impresión** (`src/app/imprimir`): recetas y órdenes de estudio con código de verificación.

Todo se renderiza en el servidor por solicitud (necesario para la CSP con nonce y para que
los cambios publicados desde el panel se vean de inmediato).

## Estructura de carpetas

```
prisma/                 Esquema, migraciones SQL y datos base / demostración
src/app/                Rutas (páginas, layouts, acciones de servidor, API)
src/actions/            Acciones de servidor compartidas entre portal y panel
src/components/         Componentes de interfaz (ui/, site/, panel/, portal/, clinical/, …)
src/lib/                Código compartido sin acceso a datos: validaciones (zod), etiquetas,
                        permisos, plantillas de mensajes, zona horaria, contenido por defecto
src/server/             Solo servidor (import "server-only")
  auth/                 Contraseñas, sesiones, cookies, límites de intentos, actor y permisos
  integrations/         Correo (SMTP), WhatsApp Cloud API, almacenamiento de archivos
  services/             Reglas de negocio: agenda, citas, clínica, documentos, mensajería, …
  action.ts             Envoltorio de acciones (validación y errores en español)
  audit.ts              Registro de auditoría
src/proxy.ts            CSP con nonce, cabeceras y renovación de la cookie de sesión
tests/                  unit/, integration/ (base real) y e2e/ (Playwright)
scripts/                Inicio standalone, respaldo y restauración
docker/                 Script de inicialización de PostgreSQL (rol de mínimo privilegio)
```

Regla de dependencias: las páginas y acciones llaman a `src/server/services/*`; los servicios
reciben siempre un **actor** (usuario autenticado con rol y permisos) y verifican la
autorización ellos mismos. Así, una acción nueva no puede saltarse los controles por omisión
de la página.

## Modelo de datos (resumen)

| Área | Modelos |
|---|---|
| Acceso | `User`, `Session`, `AuthToken`, `RateLimit`, `RolePermission` |
| Pacientes | `Patient`, `Consent` (historial inmutable de consentimientos) |
| Catálogo | `Specialty`, `Service`, `Professional`, `ProfessionalSpecialty`, `ProfessionalService` |
| Agenda | `ScheduleRule`, `ScheduleException`, `Appointment`, `AppointmentEvent` |
| Clínica | `ClinicalBackground` (versionado), `Encounter`, `EncounterAddendum`, `VitalSign`, `Diagnosis`, `Prescription`, `PrescriptionItem`, `StudyOrder`, `TreatmentGoal`, `ClinicalDocument` |
| Comunicación | `ContactRequest`, `Notification`, `MessageTemplate`, `OutboundMessage` |
| Contenido | `SiteContent` (borrador/publicado), `SiteContentVersion`, `SystemSetting`, `Faq`, `MediaAsset` |
| Control | `AuditLog` |

### Garantías en la base de datos (no dependen del código de la aplicación)

- **Sin superposición de citas**: restricciones `EXCLUDE USING gist` por profesional y por
  paciente sobre el rango horario de las citas activas (extensión `btree_gist`).
- **Inmutabilidad** mediante triggers (`CMIO_INMUTABLE`): auditoría, antecedentes,
  adendas, consentimientos y eventos de citas no se modifican ni se eliminan; las consultas
  finalizadas, sus signos vitales y diagnósticos, las recetas y órdenes emitidas (salvo
  anulación por su autor) y los documentos clínicos conservan su contenido.
- Restricciones `CHECK` de rangos horarios, duraciones y capacidades.

## Autenticación y autorización

- Contraseñas con **Argon2id**: de 10 a 128 caracteres, se rechazan contraseñas comunes o
  demasiado simples.
- **Sesiones en base de datos**: la cookie (`httpOnly`, `SameSite=Lax`, `Secure` y prefijo
  `__Host-` en producción) contiene un token aleatorio; la base guarda solo su SHA-256.
  Duración deslizante: 14 días para pacientes y 12 horas para el personal.
- **Bloqueo** tras 5 intentos fallidos durante 15 minutos (con el mismo comportamiento para
  correos sin cuenta, para no revelar cuáles existen) y **límites de intentos** por IP y por
  correo (registro, ingreso, recuperación, formularios públicos), guardados en la base. La IP
  se toma solo de la cabecera que agrega el proxy de confianza (`TRUST_PROXY`).
- El registro y la recuperación responden igual exista o no la cuenta o la ficha: el detalle
  llega solo al correo indicado.
- Tokens de un solo uso con hash: verificación de correo (24 h), recuperación (1 h),
  invitación del personal (72 h). Cambiar o restablecer la contraseña cierra las demás sesiones.
- **Roles**: Propietario, Administrador, Secretaría, Profesional de la salud y Paciente. El
  registro público crea siempre pacientes; los roles del personal solo se asignan por
  invitación y nunca a un rol de igual o mayor jerarquía que el de quien invita.
- **Permisos** por módulo y acción en la tabla `RolePermission`, configurables por el
  propietario dentro de un **límite por rol** (`ROLE_PERMISSION_CEILING` en
  `src/lib/permissions.ts`): por ejemplo, la secretaría nunca puede recibir permisos clínicos.
- **Acceso clínico**: no es un permiso configurable. Requiere una cuenta con rol de
  profesional, vinculada a un perfil profesional activo (solo el propietario puede vincularla,
  nunca a su propia cuenta) **y** una relación de atención con el paciente: una consulta propia
  o una cita no cancelada (si la agendó el propio profesional, cuenta desde que el paciente
  llega). Cada acceso a la historia clínica queda auditado. La exportación completa exige
  además el permiso `clinica.exportar`, que la administración no puede recibir.

## Motor de agenda

- Zona horaria fija `America/Asuncion` (Paraguay usa UTC−3 todo el año) con Luxon.
- Los turnos se generan con una función pura (`generateDaySlots`) a partir de reglas
  semanales con vigencia, excepciones (feriados de la clínica, vacaciones, bloqueos), duración
  y capacidad del servicio, anticipación mínima y ventana máxima.
- Reservar ocurre en una transacción con `pg_advisory_xact_lock` por profesional, revalidando
  disponibilidad en el servidor; la restricción `EXCLUDE` es la defensa final ante carreras.
- Estados: Programada → Confirmada → En espera → En atención → Finalizada; también Cancelada
  y Ausente (con corrección a En espera si llega tarde). Las transiciones válidas están en
  `TRANSITIONS` (`src/server/services/appointments.ts`) y cada cambio crea un
  `AppointmentEvent` inmutable. Las actualizaciones son optimistas (si otra persona cambió el
  estado, se informa en lugar de sobrescribir).
- Políticas editables en Configuración: anticipación mínima, días hacia adelante, plazos de
  cancelación y reprogramación del paciente, citas activas máximas y ventana de confirmación.

## Mensajería

- Cola en la tabla `OutboundMessage`. Cada evento genera mensajes por canal según la
  configuración, el consentimiento del paciente y la disponibilidad de credenciales.
- **Nunca se simula un envío**: sin credenciales el mensaje queda como "No enviado" con el
  motivo (`NO_CONFIGURADO`, `CANAL_DESACTIVADO`, `SIN_CONSENTIMIENTO`, …).
- Reintentos con espera creciente (hasta 5 intentos) y claves de deduplicación; la tarea
  periódica procesa la cola y encola recordatorios.
- Los correos de seguridad (verificación, recuperación, invitación) usan plantillas fijas (no
  editables desde el panel), se envían en el momento y su contenido no se guarda. El enlace de
  activación del portal de un paciente nunca se muestra al personal.
- Las plantillas solo incluyen datos administrativos (fecha, hora, profesional): nunca
  diagnósticos ni tratamientos.

## Contenido del sitio

- `SiteContent` guarda por sección un **borrador** y una versión **publicada**; publicar crea
  una `SiteContentVersion`. La vista previa (`/vista-previa`) muestra el borrador solo al
  personal autorizado.
- Los datos institucionales (teléfonos, dirección, horario, coordenadas, redes) se editan en
  el panel y se marcan como "verificados" o "provisionales".
- `SystemSetting` guarda parámetros operativos separados del contenido, para que un cambio de
  textos nunca altere reglas de agenda o notificaciones.

## Archivos

- Almacenamiento local privado (`STORAGE_LOCAL_PATH`), fuera de la carpeta pública. Se valida
  el tipo real del archivo por su firma (PDF, JPG, PNG, WebP), el tamaño (10 MB documentos,
  5 MB imágenes públicas) y se guarda el SHA-256.
- Los documentos clínicos se descargan solo por `/api/documentos/[id]` tras verificar acceso;
  cada descarga queda auditada. Las imágenes públicas se sirven por `/media/...`.
- La interfaz de almacenamiento (`src/server/integrations/storage.ts`) permite agregar un
  proveedor compatible con S3 sin cambiar los servicios (ver MODULOS-FUTUROS.md).

## Cabeceras de seguridad

CSP con nonce por solicitud y `strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`,
`form-action 'self'`, HSTS en producción, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, y `Cache-Control: no-store` + `noindex` en portal, panel, API e impresión.
