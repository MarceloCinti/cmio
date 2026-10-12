# Despliegue en producción

Esta guía describe un despliegue de referencia en un servidor propio (VPS Linux) con Docker,
PostgreSQL y un proxy inverso con HTTPS. Otras opciones (PostgreSQL administrado, otro
proveedor de contenedores) siguen los mismos principios.

> **Estado de verificación.** La salida standalone, el rol de base de datos de mínimo
> privilegio, la tarea periódica y los scripts de respaldo se probaron en el entorno de
> desarrollo (ver PLAN-DE-PRUEBAS.md). La construcción de la imagen Docker y el
> `docker compose` **no se pudieron ejecutar** en ese entorno: verifícalos en el servidor
> antes de publicar.

## Arquitectura de referencia

```
Internet ──HTTPS──► Caddy o Nginx (443) ──HTTP──► app:3000 (Next.js standalone, usuario sin privilegios)
                                                    │
                                                    ├── PostgreSQL 16 (rol cmio_app: solo filas)
                                                    └── /data/storage (volumen privado de archivos)
cron (curl cada 5 min) ───────────────────────────► app:3000/api/cron (Bearer CRON_SECRET)
migrate (una vez por versión) ──► PostgreSQL (rol propietario: migraciones y datos base)
```

## 1. Preparar el servidor

- Ubuntu 24.04 o similar, Docker Engine y el plugin Compose.
- Firewall: solo 22 (SSH, idealmente con clave y restringido), 80 y 443.
- Zona horaria del sistema indiferente: la aplicación usa siempre `America/Asuncion`.
- Un dominio (por ejemplo `cmio.com.py`) apuntando al servidor.

## 2. Variables de entorno de producción

Crea `.env.production` en el servidor (permisos `600`, nunca en el repositorio):

```bash
# Base de datos (los usa docker-compose.yml)
POSTGRES_PASSWORD=…           # openssl rand -hex 24
APP_DB_PASSWORD=…             # openssl rand -hex 24 (rol cmio_app)

# Aplicación
APP_URL=https://cmio.com.py
CRON_SECRET=…                 # openssl rand -hex 32
TRUST_PROXY=true
DEMO_MODE=false

# Cuenta inicial del propietario (solo el primer arranque; luego bórrala)
OWNER_EMAIL=…
OWNER_NAME=…
OWNER_PASSWORD=…

# Correo (ver INTEGRACIONES.md)
EMAIL_DRIVER=smtp
EMAIL_FROM="CMIO <no-responder@cmio.com.py>"
SMTP_HOST=…
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=…
SMTP_PASSWORD=…

# WhatsApp (opcional, ver INTEGRACIONES.md)
WHATSAPP_PROVIDER=disabled
```

`DATABASE_URL` y `STORAGE_LOCAL_PATH` los define `docker-compose.yml` para cada servicio.

## 3. Levantar los servicios

```bash
git clone <repositorio> cmio && cd cmio
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production logs -f migrate app
```

Orden de arranque: `db` → `migrate` (aplica migraciones y `db:seed`, luego termina) → `app`
→ `cron`.

Después del primer arranque:

1. Ingresa con la cuenta del propietario y cambia la contraseña si fue compartida.
2. Elimina `OWNER_PASSWORD` de `.env.production`.
3. Completa la lista de verificación del panel (inicio del propietario) y
   [PENDIENTES.md](PENDIENTES.md) antes de anunciar el sitio.

## 4. Proxy inverso con HTTPS

### Caddy (certificados automáticos)

```caddyfile
cmio.com.py {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
    # Tamaño máximo de subida (documentos de hasta 10 MB)
    request_body {
        max_size 12MB
    }
}
```

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name cmio.com.py;
    ssl_certificate     /etc/letsencrypt/live/cmio.com.py/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cmio.com.py/privkey.pem;
    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
server { listen 80; server_name cmio.com.py; return 301 https://$host$request_uri; }
```

Importante:

- La aplicación debe ser accesible **solo** a través del proxy (en `docker-compose.yml` el
  puerto se publica en `127.0.0.1`). Con `TRUST_PROXY=true` se toma como IP del cliente la
  última entrada de `X-Forwarded-For`, la que agrega el proxy. Si hay más de un proxy propio
  delante (por ejemplo, un balanceador), define `TRUST_PROXY_HOPS`.
- La aplicación envía HSTS en producción: sirve el dominio siempre por HTTPS.

## 5. Base de datos: roles separados

`docker/postgres-init/01-rol-aplicacion.sh` crea, al inicializar el volumen, el rol
`cmio_app` con permisos solo de `SELECT/INSERT/UPDATE/DELETE` sobre las tablas que cree el
rol propietario. Así:

- La aplicación no puede crear, modificar, vaciar (`TRUNCATE`) ni eliminar tablas.
- Los triggers de inmutabilidad (auditoría, historia clínica) no pueden desactivarse desde la
  aplicación.
- Las migraciones se ejecutan con el rol propietario solo en el servicio `migrate`.

Con PostgreSQL administrado, crea los dos roles manualmente con las mismas sentencias del
script y usa la URL del propietario solo para `pnpm db:deploy`.

## 6. Tarea periódica

El servicio `cron` llama a `/api/cron` cada 5 minutos. La tarea:

- encola recordatorios según la anticipación configurada,
- procesa la cola de mensajes con reintentos,
- limpia sesiones, tokens y límites de intentos vencidos.

Sin Docker, usa el cron del sistema:

```cron
*/5 * * * * curl -fsS -m 120 -H "Authorization: Bearer <CRON_SECRET>" https://cmio.com.py/api/cron > /dev/null
```

La página **Configuración** del panel muestra cuándo se ejecutó por última vez.

## 7. Archivos

Los documentos clínicos y las imágenes subidas se guardan en el volumen `storage`
(`/data/storage`), fuera de la carpeta pública. Inclúyelo en los respaldos
([RESPALDOS.md](RESPALDOS.md)). No lo montes en un servidor web.

## 8. Actualizar a una nueva versión

```bash
scripts/respaldo.sh   # o el procedimiento de RESPALDOS.md con docker compose
git pull
docker compose --env-file .env.production up -d --build
```

`migrate` aplica las migraciones nuevas (son aditivas y no destructivas) antes de iniciar la
nueva versión de `app`.

## 9. Monitoreo

- `GET /api/salud` responde 200 si la aplicación y la base están disponibles (lo usa el
  `HEALTHCHECK` de la imagen). Configura un monitor externo sobre esa ruta.
- Revisa periódicamente en el panel: **Mensajes** (envíos fallidos), **Auditoría** (accesos
  denegados, bloqueos de cuentas, exportaciones) y la última ejecución de la tarea periódica.

## Lista de verificación antes de publicar

- [ ] HTTPS activo y redirección desde HTTP.
- [ ] `APP_URL` con `https://`, `TRUST_PROXY=true`, `DEMO_MODE=false`.
- [ ] `EMAIL_DRIVER=smtp` probado (registro, recuperación de contraseña).
- [ ] Tarea periódica ejecutándose (ver Configuración).
- [ ] Respaldo automático programado **y una restauración de prueba realizada**.
- [ ] `OWNER_PASSWORD` eliminado del entorno.
- [ ] Datos de contacto verificados y marcados como tales en el panel.
- [ ] Textos legales revisados por asesoría legal y marcados como revisados.
- [ ] Ningún dato de demostración en la base.
