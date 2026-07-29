# syntax=docker/dockerfile:1

# OJO: el contexto de build es la RAÍZ del monorepo, no `apps/back`.
#
#   docker build -t ai-form-creator/back:dev -f apps/back/Dockerfile .
#
# El back depende de `packages/contracts` por `file:`, y eso queda fuera de
# cualquier contexto más angosto. El layout de `/repo` replica el del repo a
# propósito: npm enlaza el paquete con un symlink relativo
# (`node_modules/@ai-form-creator/contracts` → `../../../../packages/contracts`)
# que sólo resuelve si las rutas coinciden.
#
# Qué entra al contexto lo decide `apps/back/Dockerfile.dockerignore`.

# --- contratos compartidos ---
FROM node:24-alpine AS contracts
WORKDIR /repo/packages/contracts

COPY packages/contracts/package*.json ./
# `--ignore-scripts` saltea el `prepare`: el build se corre explícito abajo,
# recién cuando las fuentes están copiadas.
RUN npm ci --ignore-scripts

COPY packages/contracts/tsconfig*.json ./
COPY packages/contracts/scripts ./scripts
COPY packages/contracts/src ./src
RUN npm run build

# Poda las devDependencies y deja sólo las de runtime (TypeBox). Ese
# `node_modules` tiene que viajar: Node resuelve el symlink a su ruta real, así
# que el `require('@sinclair/typebox')` que sale de
# `packages/contracts/dist/cjs/**` se busca desde `packages/contracts/`, y NO
# ve el `node_modules` de la app. Sin esto la imagen compila y después revienta
# en el arranque.
RUN npm prune --omit=dev

# --- build ---
FROM node:24-alpine AS build
WORKDIR /repo/apps/back

# El compilado, el manifiesto y las deps de runtime: las fuentes no hacen falta.
COPY --from=contracts /repo/packages/contracts/package.json /repo/packages/contracts/
COPY --from=contracts /repo/packages/contracts/dist /repo/packages/contracts/dist
COPY --from=contracts /repo/packages/contracts/node_modules /repo/packages/contracts/node_modules

COPY apps/back/package*.json ./
COPY apps/back/prisma ./prisma
# `npm ci` dispara el postinstall (prisma generate), por eso prisma/ va antes.
RUN npm ci

COPY apps/back/tsconfig*.json apps/back/nest-cli.json ./
COPY apps/back/src ./src
RUN npm run build

# --- deps de producción ---
FROM node:24-alpine AS deps
WORKDIR /repo/apps/back

COPY --from=contracts /repo/packages/contracts/package.json /repo/packages/contracts/
COPY --from=contracts /repo/packages/contracts/dist /repo/packages/contracts/dist
COPY --from=contracts /repo/packages/contracts/node_modules /repo/packages/contracts/node_modules

COPY apps/back/package*.json ./
COPY apps/back/prisma ./prisma
RUN npm ci --omit=dev

# --- runtime ---
FROM node:24-alpine AS runtime
WORKDIR /repo/apps/back
ENV NODE_ENV=production

# El Deployment corre con runAsUser 1000 y readOnlyRootFilesystem: el proceso
# no escribe nada fuera del emptyDir montado en /tmp.
USER node

# Los contratos van como carpeta real, fuera de la app: el symlink que dejó
# npm en `node_modules` apunta acá y quedaría colgado si no se copiara.
COPY --chown=node:node --from=deps /repo/packages/contracts /repo/packages/contracts
COPY --chown=node:node --from=deps /repo/apps/back/node_modules ./node_modules
COPY --chown=node:node --from=build /repo/apps/back/dist ./dist
COPY --chown=node:node apps/back/package.json ./
COPY --chown=node:node apps/back/prisma ./prisma

EXPOSE 8080
CMD ["node", "dist/main"]
