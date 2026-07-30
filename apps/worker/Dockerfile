# syntax=docker/dockerfile:1

# OJO: el contexto de build es la RAÍZ del monorepo, no `apps/worker`.
#
#   docker build -t ai-form-creator/worker:dev -f apps/worker/Dockerfile .
#
# Mismo motivo que el back: depende de `packages/contracts` por `file:`, y eso
# queda fuera de cualquier contexto más angosto. El layout de `/repo` replica el
# del repo a propósito, porque npm enlaza el paquete con un symlink relativo que
# sólo resuelve si las rutas coinciden.
#
# ┌─ POR QUÉ NO ES ALPINE, COMO EL BACK ──────────────────────────────────────┐
# │ El SDK de Temporal para Node no es JavaScript puro: su núcleo está en Rust │
# │ y viaja como binario nativo en @temporalio/core-bridge. Los prebuilds que  │
# │ publica son x86_64/aarch64 **-linux-gnu**; no hay ninguno para musl, que   │
# │ es la libc de Alpine. Sobre Alpine, `npm ci` no falla —el paquete se       │
# │ instala igual— y la imagen se construye entera; lo que revienta es el      │
# │ arranque, con un error de módulo nativo que no menciona a musl por ningún  │
# │ lado. Compilar desde fuente pediría toolchain de Rust y varios minutos por │
# │ build.                                                                     │
# │ Debian slim pesa unos 40 MB más. Es el precio de que arranque.             │
# └────────────────────────────────────────────────────────────────────────────┘

# --- contratos compartidos ---
FROM node:24-bookworm-slim AS contracts
WORKDIR /repo/packages/contracts

COPY packages/contracts/package*.json ./
RUN npm ci --ignore-scripts

COPY packages/contracts/tsconfig*.json ./
COPY packages/contracts/scripts ./scripts
COPY packages/contracts/src ./src
RUN npm run build

# Poda las devDependencies y deja sólo TypeBox. Ese `node_modules` tiene que
# viajar: Node resuelve el symlink a su ruta real, así que los `require` que
# salen de `packages/contracts/dist/cjs/**` se buscan desde ahí y NO ven el
# `node_modules` de la app.
RUN npm prune --omit=dev

# --- build ---
FROM node:24-bookworm-slim AS build
WORKDIR /repo/apps/worker

COPY --from=contracts /repo/packages/contracts/package.json /repo/packages/contracts/
COPY --from=contracts /repo/packages/contracts/dist /repo/packages/contracts/dist
COPY --from=contracts /repo/packages/contracts/node_modules /repo/packages/contracts/node_modules

COPY apps/worker/package*.json ./
RUN npm ci

COPY apps/worker/tsconfig.json ./
COPY apps/worker/src ./src
RUN npm run build

# --- deps de producción ---
FROM node:24-bookworm-slim AS deps
WORKDIR /repo/apps/worker

COPY --from=contracts /repo/packages/contracts/package.json /repo/packages/contracts/
COPY --from=contracts /repo/packages/contracts/dist /repo/packages/contracts/dist
COPY --from=contracts /repo/packages/contracts/node_modules /repo/packages/contracts/node_modules

COPY apps/worker/package*.json ./
RUN npm ci --omit=dev

# --- runtime ---
FROM node:24-bookworm-slim AS runtime
WORKDIR /repo/apps/worker
ENV NODE_ENV=production

# Igual que el back: runAsUser 1000 y readOnlyRootFilesystem en el Deployment.
USER node

# Los contratos van como carpeta real, fuera de la app: el symlink que dejó npm
# en `node_modules` apunta acá y quedaría colgado si no se copiara.
COPY --chown=node:node --from=deps /repo/packages/contracts /repo/packages/contracts
COPY --chown=node:node --from=deps /repo/apps/worker/node_modules ./node_modules
COPY --chown=node:node --from=build /repo/apps/worker/dist ./dist
COPY --chown=node:node apps/worker/package.json ./

# No expone puertos: el worker no escucha nada. Habla con Temporal por gRPC
# saliente y toma trabajo de la cola — por eso tampoco tiene probes HTTP.
CMD ["node", "dist/worker.js"]
