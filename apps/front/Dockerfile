# syntax=docker/dockerfile:1

# --- build ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
# El script `prepare` del front es `cd ../.. && husky`: apunta a la raíz del
# monorepo, que no existe dentro de la imagen. --ignore-scripts lo saltea; a
# diferencia del back (que necesita `prisma generate`), acá no hay postinstall
# que haga falta — mockServiceWorker.js está versionado en public/.
RUN npm ci --ignore-scripts

COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

# Vite hornea las VITE_APP_* dentro del bundle: son build-time, no runtime.
# Por eso van como ARG y no como env del Deployment — cambiar de entorno es
# reconstruir la imagen, no reiniciar el pod. Los nombres los valida
# src/config/env.ts con zod: API_URL es obligatoria.
ARG VITE_APP_API_URL
ARG VITE_APP_ENABLE_API_MOCKING=false
ARG VITE_APP_URL
ENV VITE_APP_API_URL=$VITE_APP_API_URL \
    VITE_APP_ENABLE_API_MOCKING=$VITE_APP_ENABLE_API_MOCKING \
    VITE_APP_URL=$VITE_APP_URL

RUN npm run build

# --- runtime ---
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

# El Deployment corre con runAsUser 1000, readOnlyRootFilesystem: true y
# emptyDirs en /tmp y /var/cache/nginx. nginx.conf manda el pid y los temp
# paths a esas dos rutas; ver los comentarios ahí.
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# Se saltea docker-entrypoint.sh a propósito: sus scripts de
# /docker-entrypoint.d escriben en /etc/nginx (por ejemplo el de ipv6), y ahí
# el rootfs es de sólo lectura. Arrancamos nginx directo.
ENTRYPOINT ["nginx", "-g", "daemon off;"]
