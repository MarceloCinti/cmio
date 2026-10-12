#!/bin/sh
# Se ejecuta una sola vez, al crear el volumen de PostgreSQL.
# Crea el rol de la aplicación con mínimo privilegio: solo lectura/escritura de filas.
# Las migraciones se ejecutan con el rol propietario (POSTGRES_USER); la aplicación no puede
# crear, alterar, vaciar (TRUNCATE) ni eliminar tablas.
set -eu
: "${APP_DB_PASSWORD:?Define APP_DB_PASSWORD}"
psql -v ON_ERROR_STOP=1 -v app_pw="$APP_DB_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
CREATE ROLE cmio_app LOGIN PASSWORD :'app_pw';
SELECT format('GRANT CONNECT ON DATABASE %I TO cmio_app', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO cmio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cmio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cmio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO cmio_app;
EOSQL
