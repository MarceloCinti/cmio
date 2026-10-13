#!/usr/bin/env bash
# Build en Vercel. Si se define MIGRATION_DATABASE_URL (rol propietario de la base, sin parámetros
# en la URL), aplica las migraciones y los datos base antes de compilar; con DEMO_MODE=true y
# DEMO_ONLINE=true carga además los datos ficticios de demostración (solo para una instancia de
# demostración separada). La aplicación usa DATABASE_URL (rol de mínimo privilegio) al ejecutarse.
#
# MIGRATION_TLS=no-verify cifra la conexión sin validar el certificado del servidor (por ejemplo,
# el pooler de Supabase, cuyo certificado no está en el almacén de Node).
#
# Solo los despliegues de producción modifican la base: las vistas previas (VERCEL_ENV=preview)
# suelen compartir las mismas variables y, si migraran o cargaran datos, la producción quedaría
# sirviendo datos nuevos con código viejo.
set -euo pipefail

if [ -n "${MIGRATION_DATABASE_URL:-}" ] && [ "${VERCEL_ENV:-production}" != "production" ]; then
  echo "→ Vista previa (${VERCEL_ENV}): no se aplican migraciones ni datos base"
elif [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
  base="${MIGRATION_DATABASE_URL%%\?*}"
  migrate_url="$base"
  seed_url="$base"
  if [ "${MIGRATION_TLS:-}" = "no-verify" ]; then
    migrate_url="${base}?sslmode=require&sslaccept=accept_invalid_certs"
    seed_url="${base}?sslmode=no-verify"
  fi
  echo "→ Aplicando migraciones"
  DATABASE_URL="$migrate_url" pnpm exec prisma migrate deploy
  echo "→ Cargando datos base"
  DATABASE_URL="$seed_url" pnpm db:seed
  if [ "${DEMO_MODE:-}" = "true" ] && [ "${DEMO_ONLINE:-}" = "true" ]; then
    echo "→ Cargando datos de demostración"
    DATABASE_URL="$seed_url" pnpm db:seed:demo
  fi
fi

pnpm build
