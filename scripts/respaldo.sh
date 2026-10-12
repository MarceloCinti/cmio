#!/usr/bin/env bash
# Respaldo completo del CMIO: base de datos (formato custom de pg_dump) + archivos privados.
#
# Uso:
#   DATABASE_URL=postgresql://... STORAGE_LOCAL_PATH=./storage scripts/respaldo.sh [carpeta_destino]
#
# Variables opcionales:
#   RETENCION_DIAS=30           Elimina respaldos más antiguos en la carpeta destino.
#   GPG_DESTINATARIO=correo     Cifra cada archivo con la clave pública GPG indicada (recomendado
#                               si los respaldos salen del servidor). Sin esta variable no se cifra.
#
# Los respaldos contienen datos de salud: guárdalos cifrados, fuera del servidor y con acceso restringido.
set -euo pipefail
umask 077

: "${DATABASE_URL:?Define DATABASE_URL (rol propietario o de solo lectura)}"
STORAGE="${STORAGE_LOCAL_PATH:-./storage}"
DESTINO="${1:-./backups}"
RETENCION_DIAS="${RETENCION_DIAS:-30}"
FECHA="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DESTINO"

BASE="$DESTINO/cmio-db-$FECHA.dump"
ARCHIVOS="$DESTINO/cmio-archivos-$FECHA.tar.gz"

echo "→ Respaldando base de datos…"
# Prisma agrega parámetros como ?schema=public que pg_dump no acepta.
pg_dump --format=custom --no-owner --no-privileges --dbname="${DATABASE_URL%%\?*}" --file="$BASE"

echo "→ Respaldando archivos privados ($STORAGE)…"
if [ -d "$STORAGE" ]; then
  tar -czf "$ARCHIVOS" -C "$(dirname "$STORAGE")" "$(basename "$STORAGE")"
else
  echo "  (no existe la carpeta de archivos; se omite)"
  ARCHIVOS=""
fi

for f in "$BASE" $ARCHIVOS; do
  if [ -n "${GPG_DESTINATARIO:-}" ]; then
    gpg --batch --yes --recipient "$GPG_DESTINATARIO" --output "$f.gpg" --encrypt "$f"
    rm -f "$f"
    f="$f.gpg"
  fi
  sha256sum "$f" > "$f.sha256"
  echo "  ✓ $f"
done

# Retención: elimina respaldos antiguos de esta carpeta.
find "$DESTINO" -maxdepth 1 -type f -name 'cmio-*' -mtime +"$RETENCION_DIAS" -print -delete || true
echo "Respaldo terminado."
