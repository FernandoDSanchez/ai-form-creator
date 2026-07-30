# Backend — AI Form Creator

NestJS API with **hexagonal architecture** (ports and adapters) and Prisma on
top of Postgres.

## Startup

```bash
cp .env.example .env      # fill in DATABASE_URL, RAGFLOW_API_KEY, RAGFLOW_DATASET_ID
npm install
npm run db:deploy         # applies the migrations
npm run dev               # http://localhost:8080 — Swagger at /docs
```

Against the cluster's Postgres:

```bash
kubectl -n ai-form-creator port-forward svc/app-postgres 15432:5432
# and in .env: DATABASE_URL=postgresql://app:<password>@localhost:15432/ai_form_creator
```

| Command               | What it does                                 |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Nest in watch mode                           |
| `npm run lint`        | ESLint, zero tolerance for warnings          |
| `npm run check-types` | `tsc --noEmit`                               |
| `npm test`            | Jest (unit tests, no infrastructure)         |
| `npm run build`       | Compiles to `dist/`                          |
| `npm run db:migrate`  | Creates a new migration (needs the database) |
| `npm run db:deploy`   | Applies pending migrations                   |

## The endpoints

`POST /api/regulatory-documents` — `multipart/form-data`, field `file`, PDF, up
to 20 MiB.

| Code  | When                                                   |
| ----- | ------------------------------------------------------ |
| `202` | Accepted. Returns the created row, always in `PENDING` |
| `400` | The file is missing, or it is not a PDF                |
| `413` | Exceeds the size limit                                 |
| `502` | RAGFlow rejected the upload or did not answer          |

The PDF is validated by **magic numbers**, not by the `Content-Type` the client
sends: an `.exe` renamed to `.pdf` is rejected.

```bash
curl -X POST http://localhost:8080/api/regulatory-documents \
     -F "file=@resolution-1234.pdf"
```

`POST /api/form-generations` accepts a generation request and enqueues the
Temporal workflow; `POST /api/form-generations/:id/review` carries the human
verdict. See the root `README.md` for the full path of a generation.

## Architecture

Dependencies point **inwards**. The domain knows nobody; the application knows
only the domain; the infrastructure knows both.

```
src/regulatory-documents/
├── domain/                         ← core: zero imports of Nest/Prisma/HTTP
│   ├── regulatory-document.ts          entity
│   ├── regulatory-document-status.ts   statuses (`as const` object)
│   ├── uploaded-file.ts                file, knowing nothing about multipart
│   ├── errors/                         business errors (not HttpException)
│   └── ports/                          ← what the core needs from the world
│       ├── regulatory-document-repository.port.ts
│       ├── document-ingestion.port.ts
│       └── document-processing-launcher.port.ts
├── application/
│   └── register-regulatory-document.use-case.ts   ← the 4 steps, in order
└── infrastructure/                 ← adapters: they cover the ports
    ├── http/                           controller, DTOs, error filter
    ├── persistence/                    Prisma + row↔entity mapper
    ├── ragflow/                        upload proxy (native fetch)
    └── processing/                     Temporal placeholder
```

`regulatory-documents.module.ts` is **the only file that decides which adapter
covers each port**. Switching ingestion engines, databases, or wiring Temporal
in is editing one line there.

### Why the use case has no `@Injectable()`

So the application layer does not import Nest. The module instantiates it with a
`useFactory`, and its test builds it with three doubles and zero infrastructure
— see `application/__tests__/`.

### It is enforced by ESLint

Just like the front, breaking the architecture fails the lint and blocks the
commit:

- `import-x/no-restricted-paths` — the domain cannot import from `application/`
  or `infrastructure/`; the application cannot import adapters.
- `no-restricted-imports` — `domain/` and `application/` cannot import
  `@nestjs/*`, `@prisma/client`, `express` or `multer`.

The zones generate themselves: `eslint.config.mjs` reads `src/` from disk and
protects any folder with a `domain/` inside it.

## The flow (synchronous phase)

```
POST /api/regulatory-documents
   │
   ├─1─► RAGFlow  POST /api/v1/datasets/{id}/documents   → document_id
   ├─2─► Postgres INSERT regulatory_documents (PENDING)
   ├─3─► launch(documentId)        ← today it only logs; Temporal goes here
   └─4─► 202 Accepted
```

The order matters: RAGFlow first, the row after. The other way around, a failed
upload would leave `PENDING` rows referencing no file at all.

## What is missing

- **Temporal for ingestion.** The `DocumentProcessingLauncher` port already
  exists and the use case already calls it with the id. What is missing is the
  adapter doing `workflow.start('ProcessRagDoc', { args: [documentId] })`. (The
  form generation workflow, which is a different one, is already wired.)
- **RAGFlow credentials.** See `HUMAN-TASK.md` at the root: without
  `RAGFLOW_API_KEY` and `RAGFLOW_DATASET_ID` the upload returns `502`.
