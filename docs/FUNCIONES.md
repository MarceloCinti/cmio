# Funciones implementadas y verificadas

"Verificada" indica que la función tiene pruebas automáticas y/o se recorrió en el navegador
durante el desarrollo (ver [PLAN-DE-PRUEBAS.md](PLAN-DE-PRUEBAS.md)). Lo que no está
implementado se lista en [PENDIENTES.md](PENDIENTES.md).

## Sitio público

| Función | Estado |
|---|---|
| Portada: menú, encabezado principal, la clínica (bloques editables), especialidades, servicios, profesionales, cómo funciona (5 pasos), preguntas frecuentes, ubicación y contacto, pie con páginas legales | Implementada y verificada (E2E en 5 anchos) |
| Páginas de especialidad, servicios, perfiles profesionales (solo publicados y completos), preguntas frecuentes, contacto, solicitud de cita | Implementadas y verificadas |
| Servicios no confirmados ocultos; perfiles pendientes no publicados | Implementado y probado |
| Datos de contacto editables con marca "provisional/verificado" | Implementado |
| Mapa que se carga solo a pedido | Implementado |
| Formularios de contacto y solicitud de cita con consentimiento, límites y trampa para bots | Implementado y probado |
| Privacidad, términos, aviso de tratamiento de datos (borradores marcados "en revisión") | Implementado |
| Créditos de imágenes (Pexels, con autor y enlace) | Implementado |
| Verificación pública de recetas y órdenes por código (solo iniciales) | Implementado |
| SEO: metadatos, Open Graph, `sitemap.xml` y `robots.txt` dinámicos, datos estructurados (JSON-LD), `lang="es-PY"` | Implementado |
| Diseño móvil primero, sin desbordes en 360/390/768/1024/1440 px | Verificado (E2E + capturas) |
| Vista previa del contenido en borrador antes de publicar | Implementada y probada |

## Cuentas y acceso

| Función | Estado |
|---|---|
| Registro de pacientes en 2 pasos con consentimientos y verificación de correo | Implementado y probado |
| Ingreso, cierre de sesión, sesiones con renovación | Implementado y probado (integración + E2E) |
| Recuperación y cambio de contraseña | Implementado y probado |
| Bloqueo por intentos fallidos y límites de intentos | Implementado y probado |
| Invitaciones del personal con rol (sin autoasignación de roles privilegiados) | Implementado y probado |
| Desactivación de cuentas (cierra sesiones), desbloqueo, cambio de rol | Implementado y probado |
| Matriz de permisos por rol, editable por el propietario dentro de límites | Implementada y probada |

## Agenda y citas

| Función | Estado |
|---|---|
| Disponibilidad semanal por profesional con vigencias; bloqueos, vacaciones y feriados de la clínica | Implementado y probado |
| Turnos por duración y capacidad del servicio, en hora de Paraguay | Implementado y probado |
| Reserva desde el portal (asistente de 4 pasos) y desde el panel | Implementado y probado (E2E móvil y escritorio) |
| Sin doble reserva bajo concurrencia (bloqueo + restricción de base) | Probado con solicitudes simultáneas |
| Sin superposición de citas del mismo paciente | Probado |
| Sobreturnos solo con permiso y motivo | Probado |
| Confirmar, cancelar (con plazo y motivo), reprogramar (revalida disponibilidad) | Implementado y probado |
| Flujo del día: llegada, sala de espera, en atención, finalizada, ausente (con corrección) | Implementado y probado |
| Historial inmutable de cada cita | Implementado y probado |
| Agenda día/semana/mes con filtros; recepción del día | Implementado y verificado |
| Políticas editables (anticipación, ventana, plazos, máximo de citas activas) | Implementado y probado |
| Mensajes de error en español con el siguiente paso sugerido | Implementado |

## Portal del paciente

| Función | Estado |
|---|---|
| Inicio con próxima cita, avisos y accesos rápidos | Implementado |
| Mis citas: agendar, confirmar, cancelar, reprogramar según políticas | Implementado y probado |
| Documentos publicados por un profesional (descarga auditada) | Implementado y probado |
| Seguimiento: evolución de peso, objetivos e indicaciones (solo si el profesional lo habilita) | Implementado y probado |
| Perfil, cambio de contraseña, consentimientos de comunicación | Implementado |
| Notificaciones internas | Implementado |

## Panel del profesional

| Función | Estado |
|---|---|
| Agenda propia y acciones de la cita (llegada, iniciar, finalizar, ausente) | Implementado y probado |
| Disponibilidad propia | Implementado |
| Historia clínica estructurada: antecedentes versionados, consultas (motivo, enfermedad actual, examen físico, evaluación, plan, indicaciones, próxima evaluación), signos vitales con IMC, diagnósticos | Implementado y probado |
| Finalización que bloquea la consulta; correcciones por adenda | Implementado y probado (triggers) |
| Recetas y órdenes de estudio imprimibles con código de verificación, sin firma inventada; anulación por el autor | Implementado y probado |
| Objetivos de tratamiento y seguimiento compartido con el paciente | Implementado y probado |
| Revisión y publicación de documentos | Implementado y probado |
| Exportación de la historia (permiso específico, motivo, auditada) | Implementado y probado |

## Panel de secretaría

| Función | Estado |
|---|---|
| Pacientes: búsqueda, alta, edición de datos administrativos, consentimientos, invitación al portal | Implementado y probado |
| Agenda, nueva cita, reprogramación, recepción y sala de espera | Implementado y verificado (E2E) |
| Solicitudes del sitio web | Implementado |
| Subida de documentos para revisión profesional (sin ver contenido clínico) | Implementado y probado |
| Sin acceso a información clínica | Probado (integración + E2E) |

## Propietario y administración

| Función | Estado |
|---|---|
| Inicio con indicadores reales y lista de verificación de puesta en marcha | Implementado |
| Informes con filtros (período, profesional, especialidad): citas por estado, por día, por especialidad, ocupación, ausencias, cancelaciones, pacientes nuevos | Implementado y probado |
| Exportación CSV administrativa (sin datos clínicos, auditada) | Implementado y probado |
| Catálogo: especialidades, servicios (con confirmación de disponibilidad), profesionales (con verificación de credenciales), preguntas frecuentes, imágenes | Implementado y probado |
| Contenido del sitio con borrador, vista previa, publicación y versiones; colores e identidad | Implementado y probado |
| Usuarios, roles y permisos | Implementado y probado |
| Configuración de políticas y notificaciones; estado de integraciones | Implementado |
| Mensajes: registro de envíos con estado, reintento, plantillas | Implementado y probado |
| Auditoría inmutable con filtros | Implementado y probado |

## Notificaciones

| Función | Estado |
|---|---|
| Correo SMTP real (sin simulación cuando no está configurado) | Implementado y probado |
| WhatsApp Cloud API oficial con plantillas aprobadas y webhook firmado de estados | Implementado y probado (sin credenciales reales: no se envió un mensaje real) |
| Notificaciones internas | Implementado |
| Recordatorios automáticos por tarea periódica, sin duplicados | Implementado y probado |
| Reintentos con espera creciente y registro de fallos | Implementado y probado |
| Respeto del consentimiento por canal; mensajes sin información clínica | Implementado y probado |

## Operación

| Función | Estado |
|---|---|
| Build de producción standalone | Verificado |
| Dockerfile y docker-compose de referencia | Escritos; **no construidos** en el entorno de desarrollo |
| Rol de base de datos de mínimo privilegio | Verificado (E2E completo con ese rol) |
| Respaldo y restauración | Verificados |
| Comprobación de estado (`/api/salud`) | Implementado |
