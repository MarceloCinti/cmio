# syntax=docker/dockerfile:1
# Imagen de producción del CMIO (Next.js standalone) y del migrador de base de datos.
#   docker build --target runner -t cmio-app .
#   docker build --target migrator -t cmio-migrator .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

# --- Dependencias (incluye generación del cliente Prisma en postinstall) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# --- Compilación ---
FROM deps AS build
COPY . .
# El build no se conecta a la base de datos (todas las páginas se renderizan por solicitud);
# la URL solo satisface la validación de configuración.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm build

# --- Migrador: aplica migraciones y carga los datos base (idempotente) ---
FROM build AS migrator
ENV NODE_ENV=production
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm db:seed"]

# --- Aplicación ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 STORAGE_LOCAL_PATH=/data/storage
RUN groupadd --system --gid 1001 cmio \
  && useradd --system --uid 1001 --gid cmio --no-create-home cmio \
  && mkdir -p /data/storage /app/.next/cache \
  && chown -R cmio:cmio /data /app/.next/cache
# Los archivos de la aplicación pertenecen a root (solo lectura para el proceso).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Next copia `.env` a la salida standalone si existe: nunca debe ir dentro de la imagen.
RUN rm -f /app/.env /app/.env.production
USER cmio
EXPOSE 3000
VOLUME ["/data/storage"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/salud').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
