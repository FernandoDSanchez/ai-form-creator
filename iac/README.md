# iac — infraestructura de ai-form-creator

Overlay Kustomize que compone la app sobre la factory
[AItizate/forjate](https://github.com/AItizate/forjate), usando el **patrón
remoto**: el base y los componentes genéricos se traen por URL pineada; lo
propio vive acá.

## Layout

```
iac/k8s/
├── kustomization.yaml          raíz: base remoto + Tenant de MinIO + el namespace
├── components/apps/            componentes vendorizados (ver más abajo)
│   ├── databases/elasticsearch/
│   ├── databases/mysql/
│   └── rag/ragflow/            + wrappers mysql/ redis/ elasticsearch/
└── namespaces/
    └── ai-form-creator/        TODO el proyecto en un namespace
        ├── app-postgres/       wrapper namePrefix del Postgres de la app
        ├── configs/            litellm-config.yaml
        ├── patches/            ingress de RAGFlow y de Temporal + RAGFlow→LiteLLM
        └── secrets/            un .env por Secret (no van al repo)
```

Un solo namespace, a propósito: este cluster se comparte con otro proyecto que
ya instaló la base de forjate, así que `ai-tools` (el namespace que crea el
base) **no es nuestro**. Tener lo propio junto nos despega de esa base y el
borrado es de un tirón: `kubectl delete ns ai-form-creator`.

### Lo que cuesta juntar todo: colisiones

Los componentes genéricos de la factory usan el nombre `postgres` y la label
`app: postgres`. Con tres Postgres en el mismo namespace (app, Temporal,
LiteLLM) eso choca de dos formas distintas, y la segunda es silenciosa:

| Choque | Síntoma | Solución acá |
| --- | --- | --- |
| **Nombre** — StatefulSet/Service/Secret `postgres` | kustomize falla o un recurso pisa al otro | `./app-postgres` envuelve el nuestro con `namePrefix: app-`. El de Temporal queda sin prefijo porque vive dentro del bundle remoto y renombrarlo obligaría a parchear `POSTGRES_SEEDS` y dos `secretKeyRef` adentro. |
| **Label** — `app: postgres` en los tres | Ningún error: los Services se roban los pods entre sí y Temporal escribe en la base de LiteLLM | Patch en `kustomization.yaml` que renombra la label en el StatefulSet y en el selector del Service. |

`namePrefix` **no toca labels** — ese es el detalle que hace peligrosa la
segunda fila. Si agregás otra instancia de un componente genérico, renombrale
la label además del recurso, y verificá que cada Service matchee exactamente un
workload antes de aplicar.

## Versión de la factory

Todo apunta a `?ref=7ac17e6a07446969b2b12004f694e09aa134642e`.

**Tiene que ser el SHA completo de 40 caracteres** (o un tag). `git fetch` no
resuelve SHAs cortos y kustomize falla con `couldn't find remote ref`.

**No uses `v1.0.0`.** Ese tag es anterior al desacople: mete Longhorn, LiteLLM y
Open WebUI dentro del base, sin posibilidad de tomarlos como componentes
opt-in. Este proyecto necesita LiteLLM como componente.

## Qué está vendorizado y por qué

RAGFlow, MySQL y Elasticsearch **todavía no existen en la factory**, así que
viven acá como copias. Redis sí existe upstream y se toma remoto.

Regla: **no edites los componentes vendorizados.** Cualquier ajuste va como
patch desde `namespaces/rag/`. Así, cuando RAGFlow entre a forjate, migrar es:

```yaml
# namespaces/rag/kustomization.yaml
resources:
  - namespace.yaml
  - https://github.com/AItizate/forjate.git//k8s/components/bundles/ragflow-stack?ref=<nuevo>
```

y borrar `components/apps/`.

## Imágenes: construir e importar

No hay registry. Las imágenes de `front` y `back` se construyen local y se
**importan a mano al containerd de k3s**, que es un almacén distinto del de
Docker: que `docker images` la liste no significa que el kubelet la vea.

Por eso los dos Deployments usan `imagePullPolicy: IfNotPresent` y el bloque
`images` del kustomization **no les reescribe el nombre** — el del manifiesto
tiene que ser idéntico al del import. Sin eso, el kubelet las busca en
docker.io y el pod queda en `ErrImagePull`.

```bash
# --- back ---
# Contexto = raíz del repo (no apps/back): el back depende de
# packages/contracts por `file:`, que queda fuera de un contexto más angosto.
docker build -t ai-form-creator/back:dev -f apps/back/Dockerfile .

# --- front ---
# Vite hornea las VITE_APP_* dentro del bundle: son build-time, no runtime.
# Apuntar a otro entorno = reconstruir la imagen, no cambiar un env del pod.
# Mismo caso que el back: contexto = raíz del repo.
#
# VITE_APP_API_URL=/api y NO http://api.<host>: el front le habla al back por el
# mismo origen, a través del path /api del Ingress de `app.<host>`. Con hosts
# distintos el navegador bloquea las respuestas —el api-client manda
# `withCredentials: true` y el back responde `Allow-Origin: *`, combinación que
# CORS prohíbe—. `/api` es además el prefijo global del back, así que el path
# llega tal cual. El host api.<host> sigue existiendo para Swagger y curl.
docker build -t ai-form-creator/front:dev -f apps/front/Dockerfile . \
  --build-arg VITE_APP_API_URL=/api \
  --build-arg VITE_APP_ENABLE_API_MOCKING=false \
  --build-arg VITE_APP_URL=http://app.192.168.18.23.nip.io

# --- importar al containerd de k3s (necesita root: el socket es de root) ---
docker save ai-form-creator/back:dev  | sudo k3s ctr images import -
docker save ai-form-creator/front:dev | sudo k3s ctr images import -

# --- verificar que el kubelet las ve ---
sudo k3s ctr images ls -q | grep ai-form-creator
```

### Al actualizar una imagen

`dev` es un tag mutable y la política es `IfNotPresent`: reimportar **no**
reinicia nada, y los pods viejos siguen con la capa anterior. Hay que
empujarlos:

```bash
kubectl rollout restart deployment/back -n ai-form-creator
kubectl rollout restart deployment/front -n ai-form-creator
```

## Desplegar

```bash
# 0. Construir e importar las imágenes (ver la sección de arriba)

# 1. Secretos (no van al repo)
find iac -name '*.env.example' | while read f; do cp -n "$f" "${f%.example}"; done
#    y completá cada uno. Para RAGFlow: openssl rand -hex 32
#    OJO: sin `$`, backtick ni backslash en los passwords de ragflow.env

# 2. Dominios: reemplazá los example.com
grep -rn "example.com" iac/k8s/namespaces/

# 3. Ver qué se va a aplicar
kustomize build iac/k8s/

# 4. Aplicar
kustomize build iac/k8s/ | kubectl apply -f -
```

### ⚠️ Si el cluster ya tiene la base de forjate de otro proyecto

La raíz incluye el base remoto y le estampa `part-of: ai-form-creator` a todo
lo que buildea. Sobre un cluster donde otro overlay ya instaló ese base, eso le
reescribe las labels a infra compartida (traefik, operador de MinIO, CRDs,
namespaces) y le borra su `app.kubernetes.io/overlay`. Comprobalo siempre antes:

```bash
kustomize build iac/k8s/ | kubectl diff -f -
```

Si la base ya está puesta, no apliques la raíz: aplicá sólo lo propio.

```bash
kustomize build iac/k8s/namespaces/ai-form-creator | kubectl apply -f -

# y el Tenant de MinIO suelto, si no hay ninguno (`kubectl get tenants -A`)
kustomize build 'https://github.com/AItizate/forjate.git//k8s/components/apps/minio/single-server?ref=7ac17e6a07446969b2b12004f694e09aa134642e' \
  | kubectl apply -f -
```

## Lo que el base NO trae (y vas a necesitar)

Verificado sobre el manifiesto renderizado — 85 recursos, 4 namespaces propios:

| Hueco | Consecuencia | Qué hacer |
|---|---|---|
| **cert-manager**: sólo los CRDs, sin el controlador | `Certificate/security-cert` queda inerte, no hay TLS automático | Instalá cert-manager (Helm) antes de aplicar |
| **ClusterIssuer** `selfsigned-issuer` | El Certificate del base lo referencia y no existe | Creá el issuer, o borralo del build |
| **oauth2-proxy**: sólo Middlewares + Ingress | El Ingress apunta a un Service `oauth2-proxy` inexistente → 503 si lo tocás | Inerte mientras no lo uses; agregá el workload cuando quieras SSO |

Ninguno rompe el `apply`: son recursos que quedan sin reconciliar.

## Cableado entre servicios

El backend recibe esto por `back-config` / `back-secret`:

Al estar todo en el mismo namespace, alcanzan los nombres cortos:

| Destino | Endpoint |
|---|---|
| Postgres propio | `app-postgres:5432` |
| Temporal | `temporal-server:7233` |
| LiteLLM | `http://litellm:4000` |
| RAGFlow (UI/proxy) | `http://ragflow` |
| RAGFlow (API) | `http://ragflow:9380` |

Ojo con `app-postgres`: el `-` viene del `namePrefix` del wrapper. El `postgres`
pelado es el de Temporal.

LiteLLM no tiene Ingress: es sólo interno. RAGFlow y el backend le hablan a él,
no a los proveedores — todas las credenciales de modelos quedan en un Secret.

### RAGFlow → LiteLLM

`patches/ragflow-litellm-patch.yaml` le agrega a la plantilla de `service_conf`
un bloque `user_default_llm` que apunta a `http://litellm:4000/v1` con factory
`OpenAI-API-Compatible`. La key sale de `ragflow-secret` (`LITELLM_API_KEY`).

Dos cosas a saber antes de tocarlo:

- **El patch reescribe la plantilla entera.** El valor de una clave de ConfigMap
  es un string opaco: kustomize no puede insertarle un bloque, sólo reemplazarla.
  Al bumpear el componente vendorizado hay que re-diffear el patch contra
  `components/apps/rag/ragflow/service-conf.yaml`; la única diferencia esperada
  es `user_default_llm`.
- **Cada línea pasa por `eval echo`** en el entrypoint de RAGFlow, comentarios
  incluidos. Backticks, comillas dobles, `\` o `$` sueltos rompen el arranque.

Con esto RAGFlow queda apuntando al proxy, pero todavía hacen falta dos pasos
manuales (virtual key + alta del proveedor en la UI): ver `HUMAN-TASK.md`.

## Costo de recursos

Piso aproximado: **~7Gi de memoria en requests** y **~65Gi de almacenamiento**
(Elasticsearch 20Gi, MySQL 10Gi, tres Postgres 10Gi c/u, MinIO 4Gi). RAGFlow
solo pide 2Gi y su imagen pesa varios GB — el primer arranque puede tardar
10-15 minutos entre pull y migraciones.

No entra cómodo en un k3d de laptop. Para desarrollar local, lo práctico es
levantar todo menos `namespaces/rag` y apuntar `RAGFLOW_BASE_URL` al checkout
Docker Compose de `ragflow/` (ver `RAGFLOW-STARTUP.md`).

## Pendiente

- **Registry**: hoy las imágenes se importan a mano (ver «Imágenes»), lo que
  ata el deploy a la máquina que las construyó y pide `sudo` cada vez. Cuando
  haya uno, alcanza con agregarle `newName` a las dos entradas del bloque
  `images` y pasar los Deployments a `imagePullPolicy: Always` (con tags
  mutables como `dev`, `IfNotPresent` se queda con la copia cacheada).
  Dos caminos evaluados:
  - **ghcr.io** — k3s ya confía en su TLS, así que no hay que tocar el nodo.
    Los paquetes nacen privados: o se hacen públicos, o hace falta un
    `imagePullSecret` con un PAT de sólo `read:packages`.
  - **Registry en el cluster** — hay uno en `registry.192-168-18-23.sslip.io`
    (namespace `minuta`, catálogo vacío). Cuesta más: sirve TLS con el cert
    autofirmado de Traefik, así que pide `/etc/docker/daemon.json` y
    `/etc/rancher/k3s/registries.yaml`, y este último **sólo se lee al
    arrancar** → `systemctl restart k3s`, que reinicia todos los pods del
    cluster, incluidos los de `minuta`.
- **CI**: en el deploy, `kustomize edit set image ai-form-creator/back=$REGISTRY/back:$GIT_SHA`.
- **`MINIO_HOST`**: confirmá el Service real del Tenant antes del primer deploy
  con `kubectl get svc -n minio-operator`. El default asume `minio` en el
  puerto 80; si no coincide, parcheá `ragflow-config`.
