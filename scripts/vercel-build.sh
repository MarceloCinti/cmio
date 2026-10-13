#!/usr/bin/env bash
# Build en Vercel. Si se define MIGRATION_DATABASE_URL (rol propietario de la base), aplica las
# migraciones y los datos base antes de compilar; con DEMO_MODE=true y DEMO_ONLINE=true carga
# además los datos ficticios de demostración (solo para una instancia de demostración separada).
# La aplicación usa DATABASE_URL (rol de mínimo privilegio) en tiempo de ejecución.
set -euo pipefail

if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
  echo "→ Aplicando migraciones"
  DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm exec prisma migrate deploy
  echo "→ Cargando datos base"
  DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:seed
  if [ "${DEMO_MODE:-}" = "true" ] && [ "${DEMO_ONLINE:-}" = "true" ]; then
    echo "→ Cargando datos de demostración"
    DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:seed:demo
  fi
fi

pnpm build
