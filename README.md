# CMIO — Plataforma web

Plataforma del **Centro de Manejo Integral de la Obesidad (CMIO)**, Capiatá, Paraguay:
sitio público, portal del paciente, panel del personal (secretaría, profesionales,
administración y propietario), agenda con reservas en línea, historia clínica
electrónica, documentos, notificaciones por correo y WhatsApp, informes y auditoría.

> **Antes de publicar el sitio** revisa [docs/PENDIENTES.md](docs/PENDIENTES.md):
> hay datos que la clínica debe confirmar (contactos, profesionales, servicios, textos
> legales) y que la plataforma marca como provisionales hasta que se verifiquen.

## Tecnología

| Capa | Herramienta |
|---|---|
| Aplicación | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Estilos | Tailwind CSS 4 (colores de marca configurables desde el panel) |
| Base de datos | PostgreSQL 16 + Prisma 7 (migraciones versionadas) |
| Autenticación | Propia: Argon2id, sesiones en base de datos, bloqueo y límites de intentos |
| Pruebas | Vitest (unidad e integración con base real) y Playwright (E2E) |
| Despliegue | Docker (salida standalone) + proxy inverso con HTTPS |

## Inicio rápido (desarrollo)

Requisitos: Node.js 22.12 o superior, pnpm 10 y PostgreSQL 16.

```bash
pnpm install
cp .env.example .env            # completa DATABASE_URL, CRON_SECRET y la cuenta del propietario
pnpm db:deploy                  # aplica las migraciones
pnpm db:seed                    # permisos, contenido inicial, catálogo y cuenta del propietario
DEMO_MODE=true pnpm db:seed:demo   # opcional: datos ficticios de demostración
pnpm dev                        # http://localhost:3000
```

Para solo **ver la plataforma en tu computadora** con datos de demostración:
`pnpm install && pnpm local:setup && pnpm dev` (requiere PostgreSQL; ver el "Modo rápido"
de la guía).

Guía completa: [docs/INSTALACION.md](docs/INSTALACION.md).

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build de producción y ejecución (salida standalone) |
| `pnpm lint` / `pnpm typecheck` | ESLint y verificación de tipos |
| `pnpm test` | Pruebas de unidad e integración (requiere la base `cmio_test`) |
| `pnpm test:e2e` | Pruebas de punta a punta (requiere `pnpm build` y la base `cmio_e2e_test`) |
| `pnpm db:deploy` | Aplica migraciones pendientes |
| `pnpm db:seed` | Datos base idempotentes |
| `pnpm db:seed:demo` | Datos ficticios (solo con `DEMO_MODE=true`, nunca en producción) |
| `pnpm local:setup` | Prepara una instalación local de demostración (`.env`, migraciones y datos) |
| `scripts/respaldo.sh` / `scripts/restaurar.sh` | Respaldo y restauración (base + archivos) |

## Documentación

| Documento | Contenido |
|---|---|
| [INSTALACION.md](docs/INSTALACION.md) | Instalación y ejecución local |
| [ARQUITECTURA.md](docs/ARQUITECTURA.md) | Estructura, modelo de datos, seguridad, agenda, mensajería |
| [DESPLIEGUE.md](docs/DESPLIEGUE.md) | Producción con Docker, HTTPS, roles de base de datos, tareas periódicas |
| [INTEGRACIONES.md](docs/INTEGRACIONES.md) | Correo SMTP, WhatsApp Cloud API, almacenamiento, tarea periódica |
| [RESPALDOS.md](docs/RESPALDOS.md) | Procedimiento de respaldo y restauración |
| [SEGURIDAD.md](docs/SEGURIDAD.md) | Controles implementados y requisitos legales a validar |
| [FUNCIONES.md](docs/FUNCIONES.md) | Funciones implementadas y verificadas |
| [PENDIENTES.md](docs/PENDIENTES.md) | Pendientes de la clínica y funciones no implementadas |
| [PLAN-DE-PRUEBAS.md](docs/PLAN-DE-PRUEBAS.md) | Pruebas automáticas y verificación manual |
| [DEMO.md](docs/DEMO.md) | Cuentas y datos de demostración |
| [MODULOS-FUTUROS.md](docs/MODULOS-FUTUROS.md) | Módulos previstos y cómo se integran |

## Imágenes

Las fotografías del sitio provienen de Pexels (licencia que permite uso comercial). Autores,
enlaces y textos alternativos están en `src/lib/images.ts` y en la página pública
`/creditos`. No representan instalaciones, personal ni pacientes del CMIO.
