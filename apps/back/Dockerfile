# syntax=docker/dockerfile:1

# --- build ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# `npm ci` dispara el postinstall (prisma generate), por eso prisma/ va antes.
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- deps de producción ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# --- runtime ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# El Deployment corre con runAsUser 1000 y readOnlyRootFilesystem: el proceso
# no escribe nada fuera del emptyDir montado en /tmp.
USER node

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma

EXPOSE 8080
CMD ["node", "dist/main"]
