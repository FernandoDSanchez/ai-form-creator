# syntax=docker/dockerfile:1

# OJO: el contexto de build es la RAÍZ del monorepo, no `apps/front`.
#
#   docker build -t ai-form-creator/front:dev -f apps/front/Dockerfile . \
#     --build-arg VITE_APP_API_URL=...
#
# El front depende de `packages/contracts` por `file:`, y eso queda fuera de
# cualquier contexto más angosto. El layout de `/repo` replica el del repo a
# propósito: npm enlaza el paquete con un symlink relativo
# (`node_modules/@ai-form-creator/contracts` → `../../../../packages/contracts`)
# que sólo resuelve si las rutas coinciden.
#
# Qué entra al contexto lo decide `apps/front/Dockerfile.dockerignore`.

# --- contratos compartidos ---
FROM node:24-alpine AS contracts
WORKDIR /repo/packages/contracts

COPY packages/contracts/package*.json ./
# `--ignore-scripts` por consistencia con el resto: el build va explícito abajo.
RUN npm ci --ignore-scripts

COPY packages/contracts/tsconfig*.json ./
COPY packages/contracts/scripts ./scripts
COPY packages/contracts/src ./src
RUN npm run build

# Poda las devDependencies y deja sólo las de runtime (TypeBox). Ese
# `node_modules` tiene que viajar: npm resuelve el symlink a su ruta real, así
# que los imports que salen de `packages/contracts/dist/**` se buscan desde
# `packages/contracts/`, no desde el `node_modules` de la app.
RUN npm prune --omit=dev

# --- build ---
FROM node:24-alpine AS build
WORKDIR /repo/apps/front

# El compilado, el manifiesto y las deps de runtime: las fuentes no hacen falta.
COPY --from=contracts /repo/packages/contracts/package.json /repo/packages/contracts/
COPY --from=contracts /repo/packages/contracts/dist /repo/packages/contracts/dist
COPY --from=contracts /repo/packages/contracts/node_modules /repo/packages/contracts/node_modules

COPY apps/front/package*.json ./
# El script `prepare` del front es `cd ../.. && husky`: apunta a la raíz del
# monorepo, y husky no está en la imagen. --ignore-scripts lo saltea; a
# diferencia del back (que necesita `prisma generate`), acá no hay postinstall
# que haga falta — mockServiceWorker.js está versionado en public/.
RUN npm ci --ignore-scripts

COPY apps/front/tsconfig*.json apps/front/vite.config.ts apps/front/index.html ./
COPY apps/front/public ./public
COPY apps/front/src ./src

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
COPY apps/front/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /repo/apps/front/dist /usr/share/nginx/html

EXPOSE 8080

# Se saltea docker-entrypoint.sh a propósito: sus scripts de
# /docker-entrypoint.d escriben en /etc/nginx (por ejemplo el de ipv6), y ahí
# el rootfs es de sólo lectura. Arrancamos nginx directo.
ENTRYPOINT ["nginx", "-g", "daemon off;"]
