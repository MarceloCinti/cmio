# Datos y cuentas de demostración

Los datos de demostración sirven para recorrer la plataforma. Son **ficticios** y están
rotulados como tales ("Profesional Demo …", "Paciente Demo …", códigos `DEMO01`…). Mientras
`DEMO_MODE=true`, el sitio, el portal y el panel muestran un aviso permanente de entorno de
demostración.

## Cargar

```bash
DEMO_MODE=true pnpm db:seed:demo
```

El script se niega a ejecutarse si `DEMO_MODE` no es `true` o si `NODE_ENV=production`.

## Cuentas

| Rol | Correo | Contraseña |
|---|---|---|
| Propietario | `propietario@demo.cmio.local` | `Demo-Propietario-2026` |
| Administración | `admin@demo.cmio.local` | `Demo-Admin-2026` |
| Secretaría | `secretaria@demo.cmio.local` | `Demo-Secretaria-2026` |
| Profesional (clínica médica) | `medico@demo.cmio.local` | `Demo-Medico-2026` |
| Profesional (nutrición) | `nutricion@demo.cmio.local` | `Demo-Nutricion-2026` |
| Paciente | `paciente@demo.cmio.local` | `Demo-Paciente-2026` |

Estas contraseñas son públicas: **nunca** cargues datos de demostración en un servidor
accesible desde internet con datos reales.

Con `DEMO_MODE=true`, la pantalla **Ingresar** muestra estas cuentas debajo del formulario
("Usuarios de prueba", agrupadas en personal de la clínica y pacientes). Al tocar una, se
completan el correo y la contraseña; luego se presiona «Ingresar». Sin `DEMO_MODE`, la lista
no se envía al navegador (lo comprueba la prueba E2E de acceso). Las cuentas se definen en
`src/lib/demo-accounts.ts`.

## Qué incluye

- Dos perfiles profesionales activos ficticios (clínica médica y nutrición) con horarios, y un
  perfil en borrador. Se muestran después de los perfiles reales del CMIO (Dr. Hugo Rojas y
  Dr. Francisco Ríos), que no son ficticios y se cargan con los datos base.
- Cinco pacientes ficticios; "Paciente Demo Uno" tiene acceso al portal.
- Agenda del día (si es día hábil) para probar la recepción, una próxima cita del paciente
  con portal y su historial: dos consultas finalizadas, una ausencia y un objetivo de
  tratamiento.

## Recorridos sugeridos

1. **Paciente** (en el celular): ingresar → agendar una consulta de nutrición → confirmar
   asistencia → ver seguimiento y documentos.
2. **Secretaría**: Recepción → registrar llegada → la cita pasa a "En espera"; Agenda →
   reprogramar una cita; Pacientes → registrar una ficha nueva.
3. **Profesional (clínica)**: Agenda → iniciar consulta → registrar signos vitales,
   diagnóstico y receta → finalizar → imprimir la receta (con código de verificación) →
   agregar una adenda.
4. **Propietario**: Inicio (indicadores) → Informes → exportar CSV; Contenido → editar el
   titular → vista previa → publicar; Roles → ajustar permisos; Auditoría.

## Eliminar los datos de demostración

Usa una base nueva para producción: no mezcles datos de demostración con datos reales.

## Instancia de demostración en línea (Vercel)

Para mostrar la plataforma sin instalar nada se puede publicar una instancia separada, con su
**propia base de datos** (nunca la base real de la clínica). `vercel.json` y
`scripts/vercel-build.sh` ya están preparados: en cada despliegue **de producción** se aplican las
migraciones, los datos base y, si corresponde, los datos de demostración, y luego se compila. Las
vistas previas (cada push a una rama) solo compilan: no modifican la base, porque comparten sus
variables con producción. Si una vista previa trae una migración nueva, fallará hasta desplegarla
en producción. Ubica las funciones (`regions` en `vercel.json`) en la misma región que la base de datos.

Variables de entorno del proyecto en Vercel:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Conexión con el rol de mínimo privilegio (pooler en modo transacción, con `?sslmode=no-verify`) |
| `MIGRATION_DATABASE_URL` | Conexión con el rol propietario, sin parámetros (solo se usa durante el build) |
| `MIGRATION_TLS` | `no-verify` para cifrar la conexión del build sin validar el certificado (pooler de Supabase) |
| `DEMO_MODE` / `DEMO_ONLINE` | `true` / `true` (ambas son necesarias para cargar datos ficticios en un entorno de producción) |
| `APP_URL` | URL pública de la instancia (`https://…vercel.app`) |
| `CRON_SECRET` | 32 caracteres o más |
| `TRUST_PROXY` | `true` (Vercel define la IP del cliente en `X-Forwarded-For`) |
| `EMAIL_DRIVER` | `disabled` |
| `STORAGE_LOCAL_PATH` | `/tmp/cmio-storage` (los archivos subidos **no se conservan** entre ejecuciones) |

Con `DEMO_MODE=true` el sitio responde `noindex` (cabecera, metaetiqueta y `robots.txt`) para que
no aparezca en buscadores, y muestra el aviso de entorno de demostración. Las contraseñas de
demostración son públicas: no cargues datos reales en esa instancia.
