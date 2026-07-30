# syntax=docker/dockerfile:1

# HEADS UP: the build context is the ROOT of the monorepo, not `apps/worker`.
#
#   docker build -t ai-form-creator/worker:dev -f apps/worker/Dockerfile .
#
# Same reason as the back: it depends on `packages/contracts` through `file:`,
# and that falls outside any narrower context. The `/repo` layout mirrors the
# repo's on purpose, because npm links the package with a relative symlink that
# only resolves if the paths match.
#
# ┌─ WHY IT IS NOT ALPINE, LIKE THE BACK ─────────────────────────────────────┐
# │ The Temporal Node SDK is not pure JavaScript: its core is in Rust and      │
# │ travels as a native binary in @temporalio/core-bridge. The prebuilds it    │
# │ publishes are x86_64/aarch64 **-linux-gnu**; there is none for musl, which │
# │ is Alpine's libc. On Alpine, `npm ci` does not fail — the package installs │
# │ all the same — and the image builds end to end; what blows up is the       │
# │ startup, with a native module error that never mentions musl anywhere.     │
# │ Building from source would require a Rust toolchain and several minutes    │
# │ per build.                                                                 │
# │ Debian slim weighs some 40 MB more. That is the price of it starting.      │
# └────────────────────────────────────────────────────────────────────────────┘

# --- shared contracts ---
FROM node:24-bookworm-slim AS contracts
WORKDIR /repo/packages/contracts

COPY packages/contracts/package*.json ./
RUN npm ci --ignore-scripts

COPY packages/contracts/tsconfig*.json ./
COPY packages/contracts/scripts ./scripts
COPY packages/contracts/src ./src
RUN npm run build

# Prunes the devDependencies and leaves only TypeBox. That `node_modules` has
# to travel: Node resolves the symlink to its real path, so the `require` calls
# coming out of `packages/contracts/dist/cjs/**` are looked up from there and do
# NOT see the app's `node_modules`.
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

# --- production deps ---
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

# Same as the back: runAsUser 1000 and readOnlyRootFilesystem in the Deployment.
USER node

# The contracts go in as a real folder, outside the app: the symlink npm left
# in `node_modules` points here and would dangle if it were not copied.
COPY --chown=node:node --from=deps /repo/packages/contracts /repo/packages/contracts
COPY --chown=node:node --from=deps /repo/apps/worker/node_modules ./node_modules
COPY --chown=node:node --from=build /repo/apps/worker/dist ./dist
COPY --chown=node:node apps/worker/package.json ./

# It exposes no ports: the worker listens to nothing. It talks to Temporal over
# outbound gRPC and takes work from the queue — which is also why it has no HTTP
# probes.
CMD ["node", "dist/worker.js"]
