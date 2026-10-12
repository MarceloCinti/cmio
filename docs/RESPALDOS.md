# Respaldos y restauración

La plataforma guarda datos de salud: un respaldo que no se puede restaurar no es un respaldo.
Este procedimiento cubre la **base de datos** y los **archivos privados** (documentos
clínicos e imágenes subidas).

## Qué se respalda

| Elemento | Cómo |
|---|---|
| Base de datos PostgreSQL (incluye auditoría, historia clínica, configuración y contenido) | `pg_dump` en formato *custom* |
| Archivos privados (`STORAGE_LOCAL_PATH`) | `tar.gz` de la carpeta |
| Configuración (`.env.production`) | Copia manual cifrada, guardada aparte (contiene secretos) |

## Scripts incluidos

### `scripts/respaldo.sh`

```bash
DATABASE_URL=postgresql://propietario:clave@host:5432/cmio \
STORAGE_LOCAL_PATH=/ruta/a/storage \
GPG_DESTINATARIO=respaldos@cmio.com.py \
RETENCION_DIAS=30 \
scripts/respaldo.sh /ruta/a/respaldos
```

- Genera `cmio-db-<fecha>.dump`, `cmio-archivos-<fecha>.tar.gz` y un `.sha256` por archivo.
- Con `GPG_DESTINATARIO` cifra cada archivo con esa clave pública (recomendado, obligatorio si
  el respaldo sale del servidor) y borra la versión sin cifrar.
- Elimina respaldos más antiguos que `RETENCION_DIAS` en la carpeta destino.
- Crea los archivos con permisos `600` (`umask 077`).

### `scripts/restaurar.sh`

```bash
# Si están cifrados: gpg --output archivo --decrypt archivo.gpg
DATABASE_URL=postgresql://propietario:clave@host:5432/cmio_restauracion \
STORAGE_LOCAL_PATH=/ruta/a/storage-restaurado \
scripts/restaurar.sh --confirmo respaldos/cmio-db-<fecha>.dump respaldos/cmio-archivos-<fecha>.tar.gz
```

- Exige `--confirmo` porque reemplaza datos.
- Verifica las sumas SHA-256 antes de restaurar y se detiene si no coinciden.
- Restaura la base en una sola transacción (`--single-transaction --exit-on-error`).

## Con Docker Compose

```bash
# Respaldo de la base desde el contenedor
docker compose --env-file .env.production exec -T db \
  pg_dump -U cmio_owner -d cmio --format=custom > respaldos/cmio-db-$(date -u +%Y%m%dT%H%M%SZ).dump

# Respaldo de archivos desde el volumen
docker run --rm -v cmio_storage:/data/storage:ro -v "$PWD/respaldos":/out alpine \
  tar -czf /out/cmio-archivos-$(date -u +%Y%m%dT%H%M%SZ).tar.gz -C /data storage
```

(El nombre del volumen depende del nombre del proyecto de Compose; verifícalo con
`docker volume ls`.)

## Política recomendada

| Frecuencia | Qué | Retención |
|---|---|---|
| Diaria (madrugada) | Base + archivos, cifrados | 30 días |
| Semanal | Copia fuera del servidor (otro proveedor o almacenamiento externo) | 12 semanas |
| Mensual | Copia de archivo | Según la normativa sanitaria aplicable (a definir con asesoría legal) |
| Trimestral | **Prueba de restauración** completa en una base vacía | Registrar fecha y resultado |

Programación diaria con cron del sistema (ejemplo):

```cron
30 3 * * * cd /opt/cmio && set -a && . ./.env.respaldo && set +a && scripts/respaldo.sh /opt/respaldos >> /var/log/cmio-respaldo.log 2>&1
```

## Prueba de restauración (verificada)

En el entorno de desarrollo se verificó el ciclo completo:

1. Respaldo de la base de desarrollo y de una carpeta de archivos de prueba.
2. Restauración en una base nueva y vacía (`cmio_restauracion_test`).
3. Conteos idénticos de usuarios, pacientes, citas, consultas, auditoría y documentos.
4. Restricciones de exclusión (2) y triggers de inmutabilidad (12) presentes en la base restaurada.
5. Archivos restaurados idénticos (`diff -r`).
6. Un respaldo alterado es rechazado por la verificación SHA-256, y el script no se ejecuta
   sin `--confirmo`.

Repite esta prueba en el servidor real después del primer respaldo.

## Recuperación ante desastres (resumen)

1. Provisionar el servidor y Docker (ver DESPLIEGUE.md).
2. Restaurar `.env.production` desde su copia segura.
3. `docker compose up -d db` y esperar a que esté sano.
4. Restaurar la base con `scripts/restaurar.sh` usando la URL del rol propietario.
5. Restaurar los archivos en el volumen `storage`.
6. `docker compose up -d` (el migrador aplicará migraciones posteriores al respaldo, si las hay).
7. Verificar ingreso, agenda del día y descarga de un documento; revisar la auditoría.
