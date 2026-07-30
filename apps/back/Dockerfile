# syntax=docker/dockerfile:1

# HEADS UP: the build context is the ROOT of the monorepo, not `apps/back`.
#
#   docker build -t ai-form-creator/back:dev -f apps/back/Dockerfile .
#
# The back depends on `packages/contracts` through `file:`, and that falls
# outside any narrower context. The `/repo` layout mirrors the repo's on
# purpose: npm links the package with a relative symlink
# (`node_modules/@ai-form-creator/contracts` → `../../../../packages/contracts`)
# that only resolves if the paths match.
#
# What enters the context is decided by `apps/back/Dockerfile.dockerignore`.

# --- shared contracts ---
FROM node:24-alpine AS contracts
WORKDIR /repo/packages/contracts

COPY packages/contracts/package*.json ./
# `--ignore-scripts` skips the `prepare`: the build is run explicitly below,
# only once the sources are copied.
RUN npm ci --ignore-scripts

COPY packages/contracts/tsconfig*.json ./
COPY packages/contracts/scripts ./scripts
COPY packages/contracts/src ./src
RUN npm run build

# Prunes the devDependencies and leaves only the runtime ones (TypeBox). That
# `node_modules` has to travel: Node resolves the symlink to its real path, so
# the `require('@sinclair/typebox')` coming out of
# `packages/contracts/dist/cjs/**` is looked up from `packages/contracts/`, and
# does NOT see the app's `node_modules`. Without this the image builds and then
# blows up at startup.
RUN npm prune --omit=dev

# --- build ---
FROM node:24-alpine AS build
WORKDIR /repo/apps/back

# The build output, the manifest and the runtime deps: the sources are not needed.
COPY --from=contracts /repo/packages/contracts/package.json /repo/packages/contracts/
COPY --from=contracts /repo/packages/contracts/dist /repo/packages/contracts/dist
COPY --from=contracts /repo/packages/contracts/node_modules /repo/packages/contracts/node_modules

COPY apps/back/package*.json ./
COPY apps/back/prisma ./prisma
# `npm ci` fires the postinstall (prisma generate), which is why prisma/ goes first.
RUN npm ci

COPY apps/back/tsconfig*.json apps/back/nest-cli.json ./
COPY apps/back/src ./src
RUN npm run build

# --- production deps ---
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

# The Deployment runs with runAsUser 1000 and readOnlyRootFilesystem: the
# process writes nothing outside the emptyDir mounted on /tmp.
USER node

# The contracts go in as a real folder, outside the app: the symlink npm left
# in `node_modules` points here and would dangle if it were not copied.
COPY --chown=node:node --from=deps /repo/packages/contracts /repo/packages/contracts
COPY --chown=node:node --from=deps /repo/apps/back/node_modules ./node_modules
COPY --chown=node:node --from=build /repo/apps/back/dist ./dist
COPY --chown=node:node apps/back/package.json ./
COPY --chown=node:node apps/back/prisma ./prisma

EXPOSE 8080
CMD ["node", "dist/main"]
