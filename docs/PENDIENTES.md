# Pendientes

## A. Información que debe aportar o confirmar la clínica

La plataforma no inventa datos. Estos elementos están vacíos, ocultos o marcados como
provisionales hasta que la clínica los confirme desde el panel:

| Pendiente | Dónde se carga | Situación actual |
|---|---|---|
| Verificar teléfonos (+595 974 824 111, +595 992 847 006), dirección (Ruta PY02, frente al IPS, Clínica Periférica Campo Vía) y horario (lunes a viernes 09:00–19:00) | Contenido → Institución → marcar "verificados" | Cargados como provisionales |
| Confirmar que el teléfono principal usa WhatsApp (el acceso a WhatsApp se genera a partir de ese número) | Contenido → Institución → "Número de WhatsApp" | Generado desde el teléfono principal, pendiente de verificación |
| Coordenadas exactas o búsqueda del mapa | Contenido → Institución | Búsqueda por dirección, marcada provisional |
| Profesionales: nombres, matrículas, especialidades, foto y descripción | Panel → Profesionales (verificar credenciales antes de publicar) | Ningún perfil real; la sección muestra "próximamente" |
| Servicios distintos de las consultas (estudios, programas, cirugía) | Panel → Servicios → marcar "disponibilidad confirmada" | Cargados como no confirmados y ocultos |
| Textos de "La clínica" marcados como provisionales | Contenido → Portada | Visibles con marca interna de provisional |
| Logotipo y colores definitivos | Contenido → Identidad | Sin logotipo: se muestra un isotipo genérico con la sigla "CMIO" |
| Precios (si se desean publicar) | Panel → Servicios | Ocultos |
| Revisión legal de privacidad, términos y aviso de tratamiento de datos | Contenido → Legal → marcar "revisado" | Borradores con aviso "en revisión" |
| Redes sociales | Contenido → Institución | Vacías |
| Cuenta de correo transaccional (SMTP) y dominio con SPF/DKIM/DMARC | Variables de entorno | Sin configurar |
| WhatsApp Business: número, cuenta de Meta y plantillas aprobadas | Variables de entorno + Mensajes | Sin configurar |
| Dominio, servidor y respaldos externos | DESPLIEGUE.md / RESPALDOS.md | Sin configurar |

## B. Funciones no implementadas

No se presentan como disponibles en la interfaz.

| Función | Motivo / requisito |
|---|---|
| **Firma digital** de recetas, órdenes e historia clínica | Requiere un prestador de servicios de confianza habilitado (Ley 6822/2021) y validación legal. Hoy se imprime para firma manuscrita, con código de verificación. |
| **Receta electrónica** con validez ante farmacias | Depende de la normativa sanitaria y de la firma digital. |
| **Pagos en línea** y facturación electrónica | Requiere elegir pasarela (p. ej., Bancard) y definir el flujo con SIFEN; el ajuste `modules.payments` existe pero no tiene interfaz. |
| **Almacenamiento en la nube (S3 compatible)** | Solo almacenamiento local en el volumen del servidor. La interfaz está preparada. |
| **Segundo factor de autenticación (2FA)** para el personal | Recomendado antes de operar con varios usuarios. |
| **Escaneo antivirus** de archivos subidos | Se valida el tipo real del archivo; falta el escaneo (p. ej., ClamAV). |
| **Telemedicina** (videoconsultas) | No solicitado como función inmediata. |
| **Integración con laboratorios** o equipos (balanzas, bioimpedancia) | Requiere acuerdos y formatos de los proveedores. |
| **Recordatorios por SMS** | Solo correo y WhatsApp. |
| **Lista de espera** automática ante cancelaciones | No implementada. |
| **Aplicación móvil nativa** | El sitio y el portal funcionan en el navegador del celular; no hay app de tiendas. |

Detalle de cómo agregar cada módulo: [MODULOS-FUTUROS.md](MODULOS-FUTUROS.md).

## C. Verificaciones que no se pudieron hacer en el entorno de desarrollo

| Verificación | Cómo completarla |
|---|---|
| Construir la imagen Docker y levantar `docker compose` | En el servidor: `docker compose --env-file .env.production up -d --build` |
| Envío real de correo por SMTP | Configurar SMTP y probar recuperación de contraseña |
| Envío real por WhatsApp y recepción del webhook | Con credenciales de Meta y plantillas aprobadas |
| Lectura con lectores de pantalla (NVDA, VoiceOver) | Prueba manual (ver PLAN-DE-PRUEBAS.md) |
| Navegadores Safari (iOS) y Firefox | Las pruebas automáticas usan Chromium |
| Validación legal | Asesoría legal (ver SEGURIDAD.md) |

## D. Mejoras sugeridas

- Revisar el informe de ocupación con datos reales de un mes completo y ajustar indicadores.
- Definir con la clínica los plazos de conservación de datos y documentos.
- Programar la revisión periódica de la auditoría (accesos denegados, exportaciones, bloqueos).
