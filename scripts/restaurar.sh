#!/usr/bin/env bash
# Restaura un respaldo creado con scripts/respaldo.sh.
#
# Uso:
#   DATABASE_URL=postgresql://... STORAGE_LOCAL_PATH=./storage \
#     scripts/restaurar.sh --confirmo backups/cmio-db-AAAAMMDDTHHMMSSZ.dump [backups/cmio-archivos-….tar.gz]
#
# ATENCIÓN: reemplaza el contenido de la base de datos indicada y de la carpeta de archivos.
# Primero prueba la restauración en una base vacía (por ejemplo, cmio_restauracion) y verifica.
# Si los archivos están cifrados (.gpg), descífralos antes con: gpg --output archivo --decrypt archivo.gpg
set -euo pipefail
umask 077

if [ "${1:-}" != "--confirmo" ]; then
  echo "Este script reemplaza datos. Ejecuta con --confirmo como primer argumento." >&2
  exit 1
fi
shift
: "${DATABASE_URL:?Define DATABASE_URL (rol propietario de la base de destino)}"
BASE="${1:?Indica el archivo .dump de la base de datos}"
ARCHIVOS="${2:-}"
STORAGE="${STORAGE_LOCAL_PATH:-./storage}"

for f in "$BASE" $ARCHIVOS; do
  if [ -f "$f.sha256" ]; then
    (cd "$(dirname "$f")" && sha256sum --check --status "$(basename "$f").sha256") || { echo "Suma de verificación inválida: $f" >&2; exit 1; }
  fi
done

echo "→ Restaurando base de datos…"
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --single-transaction --dbname="${DATABASE_URL%%\?*}" "$BASE"

if [ -n "$ARCHIVOS" ]; then
  echo "→ Restaurando archivos en $STORAGE…"
  mkdir -p "$STORAGE"
  TMP="$(mktemp -d)"
  tar -xzf "$ARCHIVOS" -C "$TMP"
  SRC="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  cp -a "$SRC"/. "$STORAGE"/
  rm -rf "$TMP"
fi
echo "Restauración terminada. Verifica el sitio y los conteos antes de habilitar el acceso."
