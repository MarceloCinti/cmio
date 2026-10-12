# Módulos futuros

Estos módulos **no están implementados**. Para cada uno se indica qué ya está preparado en la
arquitectura y qué falta. Ninguno aparece en la interfaz como disponible.

## Firma digital y receta electrónica

- **Preparado**: recetas y órdenes son registros inmutables con número, fecha, profesional,
  matrícula y código de verificación pública (`/verificar/[codigo]`); la impresión indica que
  el documento requiere firma manuscrita.
- **Falta**: contratar un prestador de servicios de confianza habilitado (Ley 6822/2021),
  firmar un PDF generado en el servidor (PAdES) con el certificado del profesional y guardar
  el archivo firmado como documento clínico; validar con la normativa sanitaria la receta
  electrónica ante farmacias.

## Pagos en línea y facturación

- **Preparado**: servicios con precio opcional; ajuste `modules.payments` en
  `SystemSetting` (desactivado, sin interfaz); citas con código único que puede servir de
  referencia de cobro.
- **Falta**: elegir pasarela (por ejemplo Bancard u otra disponible en Paraguay), modelo
  `Payment` (cita, monto, estado, referencia del proveedor), webhook firmado de confirmación
  (mismo patrón que el de WhatsApp), conciliación y facturación electrónica (SIFEN) si
  corresponde.

## Almacenamiento compatible con S3

- **Preparado**: todo el acceso a archivos pasa por `src/server/integrations/storage.ts`
  (`storeFile`, `readStoredFile`, validación) y la base guarda solo la clave y el SHA-256.
  `STORAGE_DRIVER` ya admite valores por enumeración.
- **Falta**: implementar el controlador `s3` con el SDK del proveedor (cifrado en reposo,
  bucket privado, sin URLs públicas), agregar las variables de entorno y migrar los archivos
  existentes conservando las claves.

## Segundo factor de autenticación (2FA)

- **Preparado**: sesiones en base de datos y auditoría de ingresos.
- **Falta**: TOTP con códigos de recuperación para el personal, paso adicional en el ingreso
  y política para exigirlo por rol.

## Escaneo antivirus de archivos

- **Preparado**: un único punto de validación (`validateUpload`) antes de guardar.
- **Falta**: integrar ClamAV (contenedor `clamd`) y rechazar o poner en cuarentena archivos
  infectados.

## Telemedicina

- **Preparado**: tipos de servicio y estados de cita; las consultas se registran igual.
- **Falta**: proveedor de videollamadas con cumplimiento de privacidad, enlace por cita y
  consentimiento específico.

## Integración con laboratorios y equipos

- **Preparado**: documentos clínicos por categoría (resultados de laboratorio, estudios) con
  revisión profesional antes de publicarse al paciente; signos vitales estructurados.
- **Falta**: acuerdos y formatos (HL7/FHIR o archivos del proveedor), importación de
  resultados y de mediciones de balanzas o bioimpedancia.

## Lista de espera

- **Preparado**: eventos de cancelación y motor de disponibilidad reutilizable.
- **Falta**: inscripción en lista de espera por servicio/profesional y aviso automático
  cuando se libera un turno.

## Recordatorios por SMS

- **Preparado**: la cola de mensajes admite canales; el patrón de "no simular sin
  credenciales" ya está implementado.
- **Falta**: agregar el canal SMS (enumeración `MessageChannel`, plantillas y proveedor local).

## Aplicación móvil

- **Preparado**: diseño móvil primero; toda la lógica está en el servidor.
- **Falta**: si se justifica, convertir el portal en PWA instalable (manifest y service worker)
  antes de evaluar una app nativa.
