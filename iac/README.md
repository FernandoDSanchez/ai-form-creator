# iac — ai-form-creator infrastructure

Kustomize overlay composing the app on top of the
[AItizate/forjate](https://github.com/AItizate/forjate) factory, using the
**remote pattern**: the base and the generic components are pulled by pinned
URL; what is ours lives here.

## Layout

```
iac/k8s/
├── kustomization.yaml          root: remote base + MinIO Tenant + the namespace
├── components/apps/            vendored components (see below)
│   ├── databases/elasticsearch/
│   ├── databases/mysql/
│   └── rag/ragflow/            + mysql/ redis/ elasticsearch/ wrappers
└── namespaces/
    └── ai-form-creator/        THE WHOLE project in one namespace
        ├── app-postgres/       namePrefix wrapper of the app's Postgres
        ├── configs/            litellm-config.yaml
        ├── patches/            RAGFlow and Temporal ingress + RAGFlow→LiteLLM
        └── secrets/            one .env per Secret (never committed)
```

A single namespace, on purpose: this cluster is shared with another project
that already installed the forjate base, so `ai-tools` (the namespace the base
creates) **is not ours**. Keeping our own things together detaches us from that
base and deleting is one command: `kubectl delete ns ai-form-creator`.

### What putting it all together costs: collisions

The factory's generic components use the name `postgres` and the label
`app: postgres`. With three Postgres instances in the same namespace (app,
Temporal, LiteLLM) that clashes in two different ways, and the second one is
silent:

| Clash | Symptom | Solution here |
| --- | --- | --- |
| **Name** — StatefulSet/Service/Secret `postgres` | kustomize fails or one resource overwrites the other | `./app-postgres` wraps ours with `namePrefix: app-`. Temporal's stays unprefixed because it lives inside the remote bundle and renaming it would force patching `POSTGRES_SEEDS` and two `secretKeyRef` inside. |
| **Label** — `app: postgres` on all three | No error at all: the Services steal each other's pods and Temporal writes into LiteLLM's database | A patch in `kustomization.yaml` renaming the label in the StatefulSet and in the Service selector. |

`namePrefix` **does not touch labels** — that is the detail that makes the
second row dangerous. If you add another instance of a generic component,
rename its label as well as the resource, and check that every Service matches
exactly one workload before applying.

## Factory version

Everything points at `?ref=7ac17e6a07446969b2b12004f694e09aa134642e`.

**It has to be the full 40-character SHA** (or a tag). `git fetch` does not
resolve short SHAs and kustomize fails with `couldn't find remote ref`.

**Do not use `v1.0.0`.** That tag predates the decoupling: it bakes Longhorn,
LiteLLM and Open WebUI into the base, with no way of taking them as opt-in
components. This project needs LiteLLM as a component.

## What is vendored and why

RAGFlow, MySQL and Elasticsearch **do not exist in the factory yet**, so they
live here as copies. Redis does exist upstream and is taken remotely.

Rule: **do not edit the vendored components.** Any adjustment goes as a patch
from `namespaces/rag/`. That way, when RAGFlow lands in forjate, migrating is:

```yaml
# namespaces/rag/kustomization.yaml
resources:
  - namespace.yaml
  - https://github.com/AItizate/forjate.git//k8s/components/bundles/ragflow-stack?ref=<new>
```

and deleting `components/apps/`.

## Images: build and import

There is no registry. The `front`, `back` and `worker` images are built locally
and **imported by hand into the k3s containerd**, which is a different store
from Docker's: `docker images` listing it does not mean the kubelet sees it.

That is why the three Deployments use `imagePullPolicy: IfNotPresent` and the
`images` block of the kustomization **does not rewrite their name** — the one in
the manifest has to be identical to the one imported. Without that, the kubelet
looks for them on docker.io and the pod ends up in `ErrImagePull`.

```bash
# --- back ---
# Context = repo root (not apps/back): the back depends on packages/contracts
# through `file:`, which falls outside a narrower context.
docker build -t ai-form-creator/back:dev -f apps/back/Dockerfile .

# --- worker ---
# Same context as the back, for the same reason (packages/contracts).
#
# HEADS UP: its Dockerfile uses node:24-bookworm-slim and NOT alpine. The
# Temporal SDK carries its core in Rust as a native binary and only publishes
# prebuilds for glibc; on musl the image builds end to end and blows up at
# startup, with a native module error that never mentions musl anywhere.
docker build -t ai-form-creator/worker:dev -f apps/worker/Dockerfile .

# --- front ---
# Vite bakes the VITE_APP_* into the bundle: they are build-time, not runtime.
# Pointing at another environment = rebuilding the image, not changing a pod env.
# Same case as the back: context = repo root.
#
# VITE_APP_API_URL=/api and NOT http://api.<host>: the front talks to the back
# over the same origin, through the /api path of the `app.<host>` Ingress. With
# different hosts the browser blocks the responses — the api-client sends
# `withCredentials: true` and the back answers `Allow-Origin: *`, a combination
# CORS forbids. `/api` is also the back's global prefix, so the path arrives
# as-is. The api.<host> host still exists for Swagger and curl.
docker build -t ai-form-creator/front:dev -f apps/front/Dockerfile . \
  --build-arg VITE_APP_API_URL=/api \
  --build-arg VITE_APP_ENABLE_API_MOCKING=false \
  --build-arg VITE_APP_URL=http://app.192.168.18.23.nip.io

# --- import into the k3s containerd (needs root: the socket is root's) ---
docker save ai-form-creator/back:dev   | sudo k3s ctr images import -
docker save ai-form-creator/worker:dev | sudo k3s ctr images import -
docker save ai-form-creator/front:dev  | sudo k3s ctr images import -

# --- check the kubelet sees them ---
sudo k3s ctr images ls -q | grep ai-form-creator
```

### When updating an image

`dev` is a mutable tag and the policy is `IfNotPresent`: re-importing does
**not** restart anything, and the old pods keep the previous layer. They have to
be pushed:

```bash
kubectl rollout restart deployment/back -n ai-form-creator
kubectl rollout restart deployment/worker -n ai-form-creator
kubectl rollout restart deployment/front -n ai-form-creator
```

## Deploy

```bash
# 0. Build and import the images (see the section above)

# 1. Secrets (never committed)
find iac -name '*.env.example' | while read f; do cp -n "$f" "${f%.example}"; done
#    and fill each one in. For RAGFlow: openssl rand -hex 32
#    HEADS UP: no `$`, backtick or backslash in the ragflow.env passwords

# 2. Domains: replace the example.com placeholders
grep -rn "example.com" iac/k8s/namespaces/

# 3. See what is going to be applied
kustomize build iac/k8s/

# 4. Apply
kustomize build iac/k8s/ | kubectl apply -f -
```

### ⚠️ If the cluster already has another project's forjate base

The root includes the remote base and stamps `part-of: ai-form-creator` on
everything it builds. On a cluster where another overlay already installed that
base, that rewrites the labels of shared infra (traefik, MinIO operator, CRDs,
namespaces) and deletes its `app.kubernetes.io/overlay`. Always check first:

```bash
kustomize build iac/k8s/ | kubectl diff -f -
```

If the base is already in place, do not apply the root: apply only what is ours.

```bash
kustomize build iac/k8s/namespaces/ai-form-creator | kubectl apply -f -

# and the MinIO Tenant on its own, if there is none (`kubectl get tenants -A`)
kustomize build 'https://github.com/AItizate/forjate.git//k8s/components/apps/minio/single-server?ref=7ac17e6a07446969b2b12004f694e09aa134642e' \
  | kubectl apply -f -
```

## What the base does NOT bring (and you will need)

Verified against the rendered manifest — 85 resources, 4 namespaces of its own:

| Gap | Consequence | What to do |
|---|---|---|
| **cert-manager**: only the CRDs, no controller | `Certificate/security-cert` stays inert, there is no automatic TLS | Install cert-manager (Helm) before applying |
| **ClusterIssuer** `selfsigned-issuer` | The base's Certificate references it and it does not exist | Create the issuer, or delete it from the build |
| **oauth2-proxy**: only Middlewares + Ingress | The Ingress points at a non-existent `oauth2-proxy` Service → 503 if you touch it | Inert while you do not use it; add the workload when you want SSO |

None of them breaks the `apply`: they are resources that stay unreconciled.

## Wiring between services

The backend receives this through `back-config` / `back-secret`.

With everything in the same namespace, short names are enough:

| Destination | Endpoint |
|---|---|
| Our own Postgres | `app-postgres:5432` |
| Temporal | `temporal-server:7233` |
| LiteLLM | `http://litellm:4000` |
| RAGFlow (UI/proxy) | `http://ragflow` |
| RAGFlow (API) | `http://ragflow:9380` |

Mind `app-postgres`: the `-` comes from the wrapper's `namePrefix`. The bare
`postgres` is Temporal's.

LiteLLM has no Ingress: it is internal only. RAGFlow and the backend talk to it,
not to the providers — every model credential stays in a single Secret.

### RAGFlow → LiteLLM

`patches/ragflow-litellm-patch.yaml` adds a `user_default_llm` block to the
`service_conf` template pointing at `http://litellm:4000/v1` with the
`OpenAI-API-Compatible` factory. The key comes from `ragflow-secret`
(`LITELLM_API_KEY`).

Two things to know before touching it:

- **The patch rewrites the whole template.** The value of a ConfigMap key is an
  opaque string: kustomize cannot insert a block into it, only replace it. When
  bumping the vendored component the patch has to be re-diffed against
  `components/apps/rag/ragflow/service-conf.yaml`; the only expected difference
  is `user_default_llm`.
- **Every line goes through `eval echo`** in the RAGFlow entrypoint, comments
  included. Backticks, double quotes, a loose `\` or `$` break the startup.

With this RAGFlow points at the proxy, but two manual steps are still needed
(virtual key + registering the provider in the UI): see `HUMAN-TASK.md`.

## Resource cost

Approximate floor: **~7Gi of memory in requests** and **~65Gi of storage**
(Elasticsearch 20Gi, MySQL 10Gi, three Postgres 10Gi each, MinIO 4Gi). RAGFlow
alone asks for 2Gi and its image weighs several GB — the first boot can take
10-15 minutes between the pull and the migrations.

It does not fit comfortably in a laptop k3d. To develop locally, the practical
approach is to bring up everything except `namespaces/rag` and point
`RAGFLOW_BASE_URL` at the Docker Compose checkout in `ragflow/` (see
`RAGFLOW-STARTUP.md`).

## Pending

- **Registry**: today the images are imported by hand (see "Images"), which ties
  the deploy to the machine that built them and asks for `sudo` every time. Once
  there is one, adding `newName` to the entries of the `images` block and moving
  the Deployments to `imagePullPolicy: Always` is enough (with mutable tags like
  `dev`, `IfNotPresent` sticks to the cached copy).
  Two paths evaluated:
  - **ghcr.io** — k3s already trusts its TLS, so the node needs no changes.
    Packages are born private: either they are made public, or an
    `imagePullSecret` with a `read:packages`-only PAT is needed.
  - **In-cluster registry** — there is one at
    `registry.192-168-18-23.sslip.io` (namespace `minuta`, empty catalogue). It
    costs more: it serves TLS with Traefik's self-signed cert, so it needs
    `/etc/docker/daemon.json` and `/etc/rancher/k3s/registries.yaml`, and the
    latter **is only read at boot** → `systemctl restart k3s`, which restarts
    every pod in the cluster, `minuta`'s included.
- **CI**: on deploy, `kustomize edit set image ai-form-creator/back=$REGISTRY/back:$GIT_SHA`.
- **`MINIO_HOST`**: confirm the Tenant's real Service before the first deploy
  with `kubectl get svc -n minio-operator`. The default assumes `minio` on port
  80; if it does not match, patch `ragflow-config`.
