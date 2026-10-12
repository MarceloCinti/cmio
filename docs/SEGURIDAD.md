# Seguridad y privacidad

## Controles implementados

### Acceso y cuentas
- Contraseñas con Argon2id; nunca se guardan ni se registran en texto plano.
- Sesiones en base de datos (solo se guarda el SHA-256 del token), cookie `httpOnly`,
  `SameSite=Lax`, `Secure` y prefijo `__Host-` en producción; renovación deslizante
  (14 días pacientes, 12 horas personal); cierre de todas las sesiones al cambiar o restablecer
  la contraseña, cambiar el rol o desactivar la cuenta.
- Bloqueo tras 5 intentos fallidos (15 minutos) con el mismo comportamiento para correos sin
  cuenta; límites por IP y por correo en ingreso, registro, recuperación, verificación pública y
  formularios; mensajes genéricos que no revelan si una cuenta o una ficha existe.
- Tokens de un solo uso, con hash y vencimiento (24 h verificación, 1 h recuperación, 72 h
  invitación).
- Roles privilegiados nunca autoasignables: el registro público crea solo pacientes; las
  invitaciones no pueden otorgar un rol igual o superior al de quien invita; nadie cambia su
  propio rol; no se puede quitar al último propietario.
- Permisos por módulo y acción, configurables por el propietario dentro de un límite por rol.

### Información clínica
- Acceso solo para cuentas con rol de profesional, vinculadas (por el propietario) a un perfil
  profesional activo y con relación de atención con el paciente. Secretaría, administración y
  propietario no ven contenido clínico.
- Cada acceso a la historia clínica, descarga de documento y exportación queda auditado; los
  intentos denegados también.
- Inmutabilidad garantizada por triggers de la base: consultas finalizadas (correcciones solo
  por adenda), recetas y órdenes emitidas (solo anulables por su autor, con motivo),
  antecedentes versionados, consentimientos, eventos de citas y auditoría.
- Recetas y órdenes impresas sin firmas inventadas: muestran nombre y matrícula registrados y
  un código de verificación pública que solo revela iniciales.
- Exportación completa: permiso específico + profesional tratante + motivo obligatorio.

### Aplicación
- Validación de todos los datos en el servidor con zod (los formularios repiten la validación
  en el navegador solo para comodidad).
- Autorización en la capa de servicios (no solo en las páginas).
- CSP con nonce por solicitud y `strict-dynamic`, `frame-ancestors 'none'`, HSTS, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`; `no-store` y `noindex` en áreas privadas.
- Protección CSRF de las acciones de servidor de Next.js (verificación de origen) y cookies
  `SameSite=Lax`.
- Subida de archivos validada por firma real del contenido y tamaño; almacenamiento fuera de
  la carpeta pública; descargas con `Content-Disposition`, `nosniff` y CSP restrictiva.
- Exportaciones CSV sin datos clínicos ni teléfonos y protegidas contra inyección de fórmulas.
- Redirecciones posteriores al ingreso limitadas a rutas internas.
- Webhook de WhatsApp con firma HMAC; tarea periódica con secreto de 32+ caracteres
  comparado en tiempo constante.
- Registros del servidor sin contraseñas, tokens ni valores de consultas a la base; la
  auditoría descarta claves sensibles.
- Rol de base de datos de mínimo privilegio para la aplicación (ver DESPLIEGUE.md).

## Revisión independiente

Al cierre del desarrollo se hizo una revisión de seguridad independiente del código. Sus
hallazgos y la resolución de cada uno:

| Hallazgo | Severidad | Resolución |
|---|---|---|
| Administración podía vincular su cuenta a un perfil profesional y obtener acceso clínico | Alta | Corregido: solo el propietario vincula, solo cuentas de rol profesional, nunca la propia; el acceso clínico exige rol profesional. Con pruebas. |
| La exportación de historias no exigía relación de atención | Alta | Corregido: exige profesional tratante; la administración no puede recibir el permiso. Con pruebas. |
| Redirección abierta tras el ingreso (`/\t/sitio`) | Media | Corregido y probado. |
| IP falsificable en límites de intentos | Media | Corregido: solo se confía en la entrada agregada por el proxy. Probado. |
| El personal podía ver el enlace de activación del portal de un paciente | Media | Corregido: el enlace solo se envía al correo del paciente. |
| Relación de atención creada con citas canceladas o autoagendadas | Media | Corregido y probado (ver riesgo residual). |
| Plantillas de seguridad editables (posible desvío de enlaces) | Media | Corregido: plantillas fijas; el enlace no se guarda. Probado. |
| La secretaría veía títulos de documentos clínicos | Baja-media | Corregido: solo ve los que subió. Probado. |
| El registro revelaba si un correo o documento ya existía | Baja-media | Corregido: respuesta idéntica; el aviso va solo al correo. Probado. |
| Bloqueo revelaba cuentas existentes; notas internas visibles al paciente; enlaces `javascript:` en redes; token del webhook sin comparación en tiempo constante; detalles de Prisma en registros | Baja | Corregidos. |

## Riesgos residuales conocidos

- **Atención sin cita previa**: un profesional con permiso para agendar puede crear una cita y
  registrar la llegada del paciente para obtener acceso. Es necesario para atender sin turno
  previo; queda auditado. Por defecto los profesionales no tienen el permiso de gestionar
  citas de otros. Revisa la auditoría periódicamente.
- **Datos de contacto del paciente**: quien gestiona fichas puede cambiar el correo de un
  paciente antes de invitarlo al portal. El cambio queda auditado; limita ese permiso a
  personal de confianza.
- **Prefetch**: las solicitudes de precarga de Next.js no reciben la cabecera CSP (patrón
  recomendado por Next.js); no ejecutan HTML por sí mismas.
- **Sin segundo factor (2FA)** para el personal: recomendado como mejora (ver PENDIENTES.md).
- **Sin antivirus** sobre archivos subidos: se valida el tipo real, pero se recomienda
  agregar un escaneo (ver MODULOS-FUTUROS.md).

## Requisitos legales a validar (Paraguay)

La plataforma **no declara cumplimiento normativo**. Antes de operar, la clínica debe validar
con asesoría legal, como mínimo:

- **Ley N° 7593/2025 de Protección de Datos Personales** (promulgada en noviembre de 2025;
  según fuentes secundarias tiene un período de adecuación y reglamentación pendiente):
  bases de legitimación, datos sensibles de salud, derechos de los titulares, plazos de
  conservación, notificación de incidentes y eventual registro ante la autoridad de control.
- **Ley N° 6822/2021 de servicios de confianza** (firma electrónica y documentos
  electrónicos; reemplazó a las leyes 4017/2010 y 4610/2012): requisitos para que recetas,
  órdenes e historia clínica electrónicas tengan validez sin papel. Hoy la plataforma imprime
  documentos para firma manuscrita.
- **Normativa del Ministerio de Salud Pública y Bienestar Social** sobre historia clínica
  (contenido mínimo, conservación, acceso del paciente), recetas de medicamentos (en especial
  psicotrópicos y estupefacientes) y publicidad de servicios de salud.
- Textos de **privacidad, términos y aviso de tratamiento de datos**: la plataforma incluye
  borradores editables marcados como "pendientes de revisión legal".
- Uso de **WhatsApp** para comunicaciones con pacientes (consentimiento y contenido).

Fuentes consultadas para identificar las normas (verificar siempre el texto oficial):
[La Nación, 28/11/2025](https://www.lanacion.com.py/politica/2025/11/28/nueva-ley-de-datos-personales-refuerza-la-privacidad-sin-recortar-la-transparencia-publica/),
[Ferrere](https://ferrere.com/es/novedades/paraguay-adopta-su-ley-de-proteccion-de-datos-personales/),
[IAPP](https://iapp.org/news/a/paraguay-da-un-paso-hacia-un-marco-moderno-de-protecci-n-de-la-privacidad),
[abogados.com.ar sobre la Ley 6822/21](https://abogados.com.ar/adios-firma-digital-bienvenida-firma-electronica-cualificada/31895).

## Reporte de incidentes

Ante un acceso indebido o pérdida de datos: desactivar las cuentas involucradas (cierra sus
sesiones), preservar la auditoría (es inmutable), restablecer contraseñas, revisar las
exportaciones y descargas recientes en la auditoría y seguir el procedimiento de notificación
que indique la asesoría legal.
