# `@ai-form-creator/worker`

[Temporal](https://temporal.io) worker. It is the only process talking to the
model and the only one moving the status of a form generation.

It listens on no port: it takes work from the `form-generation` queue and writes
to `app-postgres`. If it goes down, in-flight workflows are not lost — another
worker picks the task up where it left off.

## The pipeline

```
                                     ┌──────────────────────────┐
POST /form-generations ──► back ─────► `form-generation` queue  │
   (row in PENDING)                   └───────────┬──────────────┘
                                                  │
                    ┌─────────────────────────────▼─────────────────────────┐
                    │ generateForm (workflow)                               │
                    │                                                       │
                    │  RETRIEVING   retrieveRegulatoryContext  → RAGFlow    │
                    │      │                                                │
                    │      ▼        ┌─────────────────────────────┐         │
                    │  GENERATING   │ requestFormDraft → LiteLLM  │         │
                    │      │        │ validateFormDraft (schema)  │ ×3      │
                    │  VALIDATING   │   invalid? → REPAIRING,     │         │
                    │      │        │   with the errors inside    │         │
                    │      ▼        └─────────────────────────────┘         │
                    │  AWAITING_REVIEW  ◄── the workflow halts here         │
                    │      │                                                │
                    │      │  `review` signal (sent by the back)            │
                    │      ▼                                                │
                    │  APPROVED / REJECTED                                  │
                    └───────────────────────────────────────────────────────┘
                                        │
       every status change ──► UPDATE ──► trigger ──► pg_notify
                                                            │
                                          back (LISTEN) ──► WebSocket ──► front
```

**The AI never publishes on its own.** Every generation halts at
`AWAITING_REVIEW` and waits for a person. That is the reason this is a durable
workflow and not a `POST` that waits: the wait may last days and has to survive
deployments.

## Architecture

```
src/
├── config/       # env + adapter settings. Only worker.ts and activities/ read it
├── domain/       # pure: prompt, validation, Formily compiler. Zero IO
│   └── ports/    # what the workflow needs from the world, as a type
├── activities/   # the only place with network and database
├── workflows/    # deterministic; it only orchestrates
└── worker.ts     # composition root
```

The layers are **enforced by ESLint** (`eslint.config.mjs`), just like in the
other two apps. And it is not a taste: Temporal imposes them.

Workflow code runs in a deterministic sandbox and is **re-executed from
scratch** every time the worker restarts or is replaced. In there is no network,
no disk, no `process.env`, and anything returning a different result on the
second run breaks the execution. A wrong import does not fail at compile time:
it fails in production, on a re-execution, with a `Nondeterminism error` three
days later.

That is where the three rules come from:

| From ↓ / To → | `domain` | `activities` | `config` | `pg`, `node:*` |
| ------------- | :------: | :----------: | :------: | :------------: |
| `domain`      |    ✅    |      ❌      |    ❌    |       ❌       |
| `workflows`   |    ✅    |      ❌      |    ❌    |       ❌       |
| `activities`  |    ✅    |      ✅      |    ✅    |       ✅       |

The workflow cannot import `activities/`, so it talks to them through a port
(`domain/ports/form-generation-activities.port.ts`) that `proxyActivities`
resolves. It is the same dependency inversion as the back, and here it is also
what Temporal wants.

### Why validation is an activity

`validateGeneratedForm` is a pure function: it touches nothing outside and could
be called straight from the workflow. It is wrapped in an activity anyway, and
the reason is the review wait.

A workflow can stay halted for 30 days, and in those 30 days new code will be
deployed. On re-execution, everything **inside** the workflow runs again with
the new version; if by then the schema changed and what used to validate no
longer does, the workflow would take a path different from the one already
recorded in the history and Temporal would kill it. An activity result, by
contrast, is recorded: it is re-read, not recomputed.

## Commands

| Command               | What it does                                |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Worker with `ts-node`, against `.env`       |
| `npm run lint`        | ESLint with zero tolerance for warnings     |
| `npm run check-types` | `tsc --noEmit`                              |
| `npm test`            | Jest (pure domain, no network, no database) |
| `npm run build`       | `tsc` into `dist/`                          |

In a fresh clone the contracts have to be compiled first:
`npm run contracts:build`.

## Things that bite

**Do not use Alpine.** The Temporal SDK carries its core in Rust as a native
binary and only publishes prebuilds for glibc. On musl `npm ci` does not fail
and the image builds end to end; what blows up is the startup, with a native
module error that never mentions musl anywhere. That is why the `Dockerfile`
uses `node:24-bookworm-slim` and not `node:24-alpine` like the other two.

**The database schema does not belong here.** It is governed by
`apps/back/prisma/schema.prisma` and the migrations are run by the back. The
worker only writes, with hand-written SQL, and every table and column name lives
in `activities/form-generation-store.ts`. If the table changes, that file
changes.

**`updated_at` is written by hand.** In the schema it is `@updatedAt`, which
Prisma resolves on the client: the column has neither a trigger nor a default.
Since the worker does not go through Prisma, if it did not touch it the column
would keep the insertion time for the whole pipeline.

**The workflow bundle weighs ~2.6 MB** because the contract modules it imports
declare TypeBox schemas, and the CJS build cannot be tree-shaken like the ESM
the front consumes. It is paid once when the worker starts (with
`reuseV8Context`, which is the default, the context is shared between
workflows). Splitting the package into "constants" and "schemas" would fix it at
the cost of duplicating one file per concept; today it is not worth it.

## Seeing what is going on

The Temporal UI shows every workflow, which activity it is on, how many times it
was retried and with which error. It is the place to look when a generation gets
stuck:

```
kubectl -n ai-form-creator port-forward svc/temporal-ui-svc 8080:8080
```

or the Ingress that is already set up (`temporal.<host>`).
