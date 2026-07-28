# RAGFlow startup — 2026-07-27

Notes on bringing the local RAGFlow stack up in this project.

## TL;DR

RAGFlow is running. Web UI: **http://localhost:9797**

One change was needed to get it to boot: the `--init-model-provider-tables` flag in
`ragflow/ragflow/docker/docker-compose.yml` had to be disabled, because this checkout is on a
newer commit than the Docker image it is pinned to. Details below.

## What was there before

- Working copy: `ragflow/ragflow/` — a full RAGFlow checkout at commit `d2a769c53`
  (post-`v0.27.0` master).
- `docker/.env` already had one local, uncommitted modification: `SVR_WEB_HTTP_PORT=9797`
  (instead of the default `80`). That was left as-is.
- Compose profiles resolved from `.env` to these services: `es01`, `minio`, `mysql`,
  `ragflow-cpu`, `redis` — i.e. CPU profile with Elasticsearch as the doc engine.
- No containers were running. All required images and the `docker_*` named volumes already
  existed locally, so nothing had to be pulled and prior data was reused.

## Steps taken

1. Inspected the compose setup and confirmed which services/profiles were active:
   ```bash
   cd ragflow/ragflow/docker
   docker compose -f docker-compose.yml config --profiles
   docker compose -f docker-compose.yml config --services
   docker compose -f docker-compose.yml config --images
   ```
2. Verified none of the host ports (9797, 9380–9384, 3306, 6379, 9000/9001, 1200) were taken.
3. Started the stack:
   ```bash
   docker compose -f docker-compose.yml up -d
   ```
4. Hit the version-mismatch crash loop described below, diagnosed it, applied the fix, and
   recreated the app container:
   ```bash
   docker compose -f docker-compose.yml stop ragflow-cpu
   # edit docker-compose.yml
   docker compose -f docker-compose.yml up -d ragflow-cpu
   ```
5. Waited for boot and verified the endpoints.

## The problem that had to be fixed

On the first `up`, `ragflow-cpu` crash-looped with:

```
./entrypoint.sh: line 258: tools/scripts/run_migrations.sh: No such file or directory
```

**Cause — a checkout/image version mismatch.**

- `docker-compose.yml` bind-mounts the repo's own `entrypoint.sh` into the container
  (`./entrypoint.sh:/ragflow/entrypoint.sh`), so the container runs the _checkout's_ entrypoint,
  not the image's.
- That entrypoint is from post-`v0.27.0` master. When passed `--init-model-provider-tables`
  it runs `tools/scripts/run_migrations.sh` (added in commit `0ae5961e1`, "Feat: v0.27.0 model
  provider").
- But `RAGFLOW_IMAGE` in `.env` pins `infiniflow/ragflow:v0.26.4` (built Jul 7). That image's
  `/ragflow/tools/scripts/` has no `run_migrations.sh`.
- `entrypoint.sh` runs under `set -e`, so the missing script killed the boot before the servers
  started, and `restart: unless-stopped` turned it into a loop.

Note this is an upstream inconsistency, not something misconfigured locally: master's `.env`
still points at the previous release image while master's entrypoint expects the newer one.

**Fix applied** — commented out the flag in `ragflow/ragflow/docker/docker-compose.yml`:

```yaml
command:
  - --enable-adminserver
  # Requires tools/scripts/run_migrations.sh, which only exists in v0.27.x+ images.
  # Re-enable together with a RAGFLOW_IMAGE that matches this checkout.
  # - --init-model-provider-tables
```

**Why this fix and not the alternative.** `run_migrations.sh` migrates the database to schema
`v0.27.0.dev1`. Running it would push the DB _ahead_ of the `v0.26.4` code that is actually
running. Skipping it keeps the schema aligned with the running image. The other coherent option
is to move the image forward to match the checkout (see "If you want v0.27.x" below).

Nothing else in the master entrypoint conflicted with the older image: `API_PROXY_SCHEME` is
`python`, so none of the newer Go binaries (`bin/ragflow_server`) are invoked.

## Current state

```
docker-es01-1          Up (healthy)   0.0.0.0:1200->9200
docker-minio-1         Up (healthy)   0.0.0.0:9000-9001->9000-9001
docker-mysql-1         Up (healthy)   0.0.0.0:3306->3306
docker-redis-1         Up (healthy)   0.0.0.0:6379->6379
docker-ragflow-cpu-1   Up             0.0.0.0:9797->80, 9380-9384, 443
```

`docker-ragflow-cpu-1` has `RestartCount=0` — no crash loop.

Verified endpoints:

| Service       | URL                              | Result                                                   |
| ------------- | -------------------------------- | -------------------------------------------------------- |
| Web UI        | http://localhost:9797            | `200`, serves the RAGFlow app (`<title>RAGFlow</title>`) |
| HTTP API      | http://localhost:9380/api/v1/... | `401` unauthenticated — routing works                    |
| Admin server  | http://localhost:9381            | up (Quart running on 9381)                               |
| MinIO console | http://localhost:9001            | `200`                                                    |
| Elasticsearch | http://localhost:1200            | `401` (security enabled)                                 |

Boot confirmations from the logs:

```
Elasticsearch http://es01:9200 is healthy.
RAGFlow data sync is ready after 29.4s initialization.
RAGFlow admin is ready after 34.8s initialization.
RAGFlow server is ready after 40.6s initialization.
Running on http://0.0.0.0:9380
```

Total cold start is roughly 60–90s. During that window the UI answers on 9797 but API calls
return `502` from nginx — that is expected and clears on its own.

### Harmless warnings seen in the logs

- `Unknown configuration key: seekdb / nats / clickhouse / otel / ingestor / file_syncer /
user_default_llm` — the checkout's newer `service_conf.yaml.template` is bind-mounted into the
  older image, which does not know those keys yet. Ignored at runtime.
- `Load term.freq FAIL!` — an optional NLP resource; standard in RAGFlow CPU startups.
- `pkg_resources is deprecated` from xgboost — upstream dependency noise.

## Everyday commands

All from `ragflow/ragflow/docker`:

```bash
# start
docker compose -f docker-compose.yml up -d

# status
docker compose -f docker-compose.yml ps

# logs (app container)
docker compose -f docker-compose.yml logs -f ragflow-cpu

# stop, keeping data volumes
docker compose -f docker-compose.yml stop

# tear down containers, keeping data volumes
docker compose -f docker-compose.yml down
```

Data lives in the named volumes `docker_mysql_data`, `docker_esdata01`, `docker_minio_data`,
`docker_redis_data`. Do **not** pass `-v` to `down` unless you intend to wipe knowledge bases,
uploaded documents and users.

Heads up: the compose project name is derived from the directory name, which is just `docker`.
The other RAGFlow checkout at `~/ragflow/docker` would resolve to the same project name and
therefore the same volumes. Run only one of the two at a time, or set `COMPOSE_PROJECT_NAME`.

## If you want v0.27.x instead

To run the code this checkout actually corresponds to, rather than `v0.26.4`:

1. Set `RAGFLOW_IMAGE` in `docker/.env` to a matching `v0.27.x` / nightly tag (roughly a 9 GB
   pull).
2. Re-enable `- --init-model-provider-tables` in `docker-compose.yml` so the model-provider
   migrations run.
3. Back up the MySQL volume first — the migration is a forward schema change and going back to
   `v0.26.4` afterwards would not be clean.

## Files changed

| File                                        | Change                                       | Status                  |
| ------------------------------------------- | -------------------------------------------- | ----------------------- |
| `ragflow/ragflow/docker/docker-compose.yml` | Commented out `--init-model-provider-tables` | Made now, uncommitted   |
| `ragflow/ragflow/docker/.env`               | `SVR_WEB_HTTP_PORT=9797`                     | Pre-existing, untouched |

To revert the compose change: `git -C ragflow/ragflow checkout docker/docker-compose.yml`
(note this restores the crash loop unless the image is upgraded).

## Not covered

- No login was performed, so no account credentials were validated. If this is a fresh
  database, register a new account at http://localhost:9797 — the first user registered becomes
  the superuser.
- No LLM/embedding provider API keys were configured. `service_conf.yaml` references a TEI
  embedding endpoint at `http://tei:80`, but the `tei-cpu` / `tei-gpu` profiles are **not**
  enabled, so no embedding service is currently running. A model provider has to be set up in
  the UI (or that profile enabled) before documents can be parsed and indexed.
