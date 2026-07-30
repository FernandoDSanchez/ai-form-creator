# syntax=docker/dockerfile:1

# HEADS UP: the build context is the ROOT of the monorepo, not `apps/front`.
#
#   docker build -t ai-form-creator/front:dev -f apps/front/Dockerfile . \
#     --build-arg VITE_APP_API_URL=...
#
# The front depends on `packages/contracts` through `file:`, and that falls
# outside any narrower context. The `/repo` layout mirrors the repo's on
# purpose: npm links the package with a relative symlink
# (`node_modules/@ai-form-creator/contracts` → `../../../../packages/contracts`)
# that only resolves if the paths match.
#
# What enters the context is decided by `apps/front/Dockerfile.dockerignore`.

# --- shared contracts ---
FROM node:24-alpine AS contracts
WORKDIR /repo/packages/contracts

COPY packages/contracts/package*.json ./
# `--ignore-scripts` for consistency with the rest: the build is explicit below.
RUN npm ci --ignore-scripts

COPY packages/contracts/tsconfig*.json ./
COPY packages/contracts/scripts ./scripts
COPY packages/contracts/src ./src
RUN npm run build

# Prunes the devDependencies and leaves only the runtime ones (TypeBox). That
# `node_modules` has to travel: npm resolves the symlink to its real path, so
# the imports coming out of `packages/contracts/dist/**` are looked up from
# `packages/contracts/`, not from the app's `node_modules`.
RUN npm prune --omit=dev

# --- build ---
FROM node:24-alpine AS build
WORKDIR /repo/apps/front

# The build output, the manifest and the runtime deps: the sources are not needed.
COPY --from=contracts /repo/packages/contracts/package.json /repo/packages/contracts/
COPY --from=contracts /repo/packages/contracts/dist /repo/packages/contracts/dist
COPY --from=contracts /repo/packages/contracts/node_modules /repo/packages/contracts/node_modules

COPY apps/front/package*.json ./
# The front's `prepare` script is `cd ../.. && husky`: it points at the root of
# the monorepo, and husky is not in the image. --ignore-scripts skips it; unlike
# the back (which needs `prisma generate`), here there is no postinstall that is
# needed — mockServiceWorker.js is versioned in public/.
RUN npm ci --ignore-scripts

COPY apps/front/tsconfig*.json apps/front/vite.config.ts apps/front/index.html ./
COPY apps/front/public ./public
COPY apps/front/src ./src

# Vite bakes the VITE_APP_* into the bundle: they are build-time, not runtime.
# That is why they go as ARG and not as Deployment env — switching environments
# means rebuilding the image, not restarting the pod. The names are validated by
# src/config/env.ts with zod: API_URL is mandatory.
ARG VITE_APP_API_URL
ARG VITE_APP_ENABLE_API_MOCKING=false
ARG VITE_APP_URL
ENV VITE_APP_API_URL=$VITE_APP_API_URL \
    VITE_APP_ENABLE_API_MOCKING=$VITE_APP_ENABLE_API_MOCKING \
    VITE_APP_URL=$VITE_APP_URL

RUN npm run build

# --- runtime ---
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

# The Deployment runs with runAsUser 1000, readOnlyRootFilesystem: true and
# emptyDirs on /tmp and /var/cache/nginx. nginx.conf sends the pid and the temp
# paths to those two locations; see the comments there.
COPY apps/front/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /repo/apps/front/dist /usr/share/nginx/html

EXPOSE 8080

# docker-entrypoint.sh is deliberately skipped: its /docker-entrypoint.d
# scripts write into /etc/nginx (the ipv6 one, for instance), and there the
# rootfs is read-only. We start nginx directly.
ENTRYPOINT ["nginx", "-g", "daemon off;"]
