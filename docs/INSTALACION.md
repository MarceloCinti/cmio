# Instalación y ejecución local

## Requisitos

- Node.js **22.12** o superior y **pnpm 10** (`corepack enable`).
- **PostgreSQL 16** (o superior) con la extensión `btree_gist` disponible (incluida en
  PostgreSQL; la migración la habilita).
- Para las pruebas E2E: Chromium de Playwright (`pnpm exec playwright install chromium`) o la
  ruta a un Chromium existente en `PW_CHROMIUM_PATH`.

## 1. Base de datos

```sql
-- Como superusuario de PostgreSQL
CREATE ROLE cmio LOGIN PASSWORD 'una-clave-local' CREATEDB;
CREATE DATABASE cmio_dev OWNER cmio;
CREATE DATABASE cmio_test OWNER cmio;      -- pruebas de integración (se vacía en cada prueba)
CREATE DATABASE cmio_e2e_test OWNER cmio;  -- pruebas E2E (se vacía en cada ejecución)
```

Los nombres de las bases de prueba **deben terminar en `_test`**: las pruebas se niegan a
ejecutarse sobre otra base para evitar borrar datos reales.

## 2. Variables de entorno

```bash
cp .env.example .env
```

Completa como mínimo:

| Variable | Ejemplo para desarrollo |
|---|---|
| `DATABASE_URL` | `postgresql://cmio:una-clave-local@localhost:5432/cmio_dev` |
| `CRON_SECRET` | resultado de `openssl rand -hex 32` |
| `EMAIL_DRIVER` | `file` (guarda los correos en `.data/mail` sin enviarlos) |
| `OWNER_EMAIL`, `OWNER_NAME`, `OWNER_PASSWORD` | cuenta inicial del propietario (contraseña de 12 caracteres o más) |
| `DEMO_MODE` | `true` solo si vas a cargar datos de demostración |

Para las pruebas: `TEST_DATABASE_URL` (por defecto `…/cmio_test`) y `E2E_DATABASE_URL`
(por defecto `…/cmio_e2e_test`).

## 3. Instalar, migrar y cargar datos

```bash
pnpm install            # también genera el cliente de Prisma
pnpm db:deploy          # aplica las migraciones (no destructivo)
pnpm db:seed            # permisos, contenido inicial, catálogo base, plantillas y propietario
```

`db:seed` es idempotente: puede ejecutarse varias veces sin duplicar datos ni sobrescribir
lo editado desde el panel.

Datos de demostración (opcional, ficticios y claramente rotulados):

```bash
DEMO_MODE=true pnpm db:seed:demo
```

Ver [DEMO.md](DEMO.md). Nunca los cargues en una base de producción (el script se niega si
`NODE_ENV=production`).

## 4. Ejecutar

```bash
pnpm dev                 # desarrollo en http://localhost:3000
```

Build de producción local:

```bash
pnpm build
pnpm start               # ejecuta la salida standalone en http://localhost:3000
```

## 5. Tareas periódicas en desarrollo

Los recordatorios y la cola de mensajes se procesan llamando a `/api/cron`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron
```

## 6. Verificaciones

```bash
pnpm lint
pnpm typecheck
pnpm test                # unidad + integración (base cmio_test)
pnpm build && PW_CHROMIUM_PATH=/ruta/a/chromium pnpm test:e2e   # E2E (base cmio_e2e_test)
```

## 7. Cambios en el modelo de datos

1. Edita `prisma/schema.prisma`.
2. Crea la migración sin aplicarla: `pnpm exec prisma migrate dev --create-only --name descripcion`.
3. Revisa el SQL generado (no debe borrar datos; agrega restricciones o triggers si corresponde).
4. Aplica: `pnpm db:deploy` y regenera el cliente: `pnpm db:generate`.

Nunca uses `prisma migrate reset` sobre una base con datos reales.

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `Configuración de entorno inválida` al iniciar | Revisa el mensaje: indica la variable faltante o inválida. |
| El registro de pacientes dice que no está disponible | El registro en línea requiere correo configurado (`EMAIL_DRIVER=smtp` o `file` en desarrollo) para verificar la cuenta. |
| Los correos no llegan en desarrollo | Con `EMAIL_DRIVER=file` se guardan en `.data/mail/*.eml`. |
| Las pruebas fallan con "base de datos de prueba" | El nombre de la base debe terminar en `_test`. |
