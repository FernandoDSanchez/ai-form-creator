# Backend — AI Form Creator

API en NestJS con **arquitectura hexagonal** (puertos y adaptadores) y Prisma
sobre Postgres. Hoy expone un único caso de uso: dar de alta un
`RegulatoryDocument`.

## Arranque

```bash
cp .env.example .env      # completar DATABASE_URL, RAGFLOW_API_KEY, RAGFLOW_DATASET_ID
npm install
npm run db:deploy         # aplica las migraciones
npm run dev               # http://localhost:8080 — Swagger en /docs
```

Contra el Postgres del cluster:

```bash
kubectl -n ai-form-creator port-forward svc/app-postgres 15432:5432
# y en .env: DATABASE_URL=postgresql://app:<password>@localhost:15432/ai_form_creator
```

| Comando               | Qué hace                                    |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Nest en watch mode                          |
| `npm run lint`        | ESLint, 0 tolerancia a warnings             |
| `npm run check-types` | `tsc --noEmit`                              |
| `npm test`            | Jest (unitarios, sin infraestructura)       |
| `npm run build`       | Compila a `dist/`                           |
| `npm run db:migrate`  | Crea una migración nueva (necesita la base) |
| `npm run db:deploy`   | Aplica migraciones pendientes               |

## El endpoint

`POST /api/regulatory-documents` — `multipart/form-data`, campo `file`, PDF,
hasta 20 MiB.

| Código | Cuándo                                                  |
| ------ | ------------------------------------------------------- |
| `202`  | Aceptado. Devuelve la fila creada, siempre en `PENDING` |
| `400`  | Falta el archivo, o no es un PDF                        |
| `413`  | Excede el límite de tamaño                              |
| `502`  | RAGFlow rechazó la subida o no respondió                |

El PDF se valida por **magic numbers**, no por el `Content-Type` que manda el
cliente: un `.exe` renombrado a `.pdf` se rechaza.

```bash
curl -X POST http://localhost:8080/api/regulatory-documents \
     -F "file=@resolucion-1234.pdf"
```

## Arquitectura

Las dependencias apuntan **hacia adentro**. El dominio no conoce a nadie; la
aplicación conoce sólo al dominio; la infraestructura conoce a los dos.

```
src/regulatory-documents/
├── domain/                         ← núcleo: cero imports de Nest/Prisma/HTTP
│   ├── regulatory-document.ts          entidad
│   ├── regulatory-document-status.ts   estados (objeto `as const`)
│   ├── uploaded-file.ts                archivo, sin saber de multipart
│   ├── errors/                         errores de negocio (no HttpException)
│   └── ports/                          ← lo que el núcleo necesita del mundo
│       ├── regulatory-document-repository.port.ts
│       ├── document-ingestion.port.ts
│       └── document-processing-launcher.port.ts
├── application/
│   └── register-regulatory-document.use-case.ts   ← los 4 pasos, en orden
└── infrastructure/                 ← adaptadores: tapan los puertos
    ├── http/                           controlador, DTOs, filtro de errores
    ├── persistence/                    Prisma + mapper fila↔entidad
    ├── ragflow/                        proxy de subida (fetch nativo)
    └── processing/                     placeholder de Temporal
```

`regulatory-documents.module.ts` es **el único archivo que decide qué adaptador
tapa cada puerto**. Cambiar de motor de ingesta, de base o conectar Temporal es
editar una línea de ahí.

### Por qué el caso de uso no tiene `@Injectable()`

Para que la capa de aplicación no importe Nest. El módulo lo instancia con un
`useFactory`, y su test lo construye con tres dobles y cero infraestructura —
mirá `application/__tests__/`.

### Está forzado por ESLint

Igual que el front, romper la arquitectura falla el lint y bloquea el commit:

- `import-x/no-restricted-paths` — el dominio no puede importar de
  `application/` ni de `infrastructure/`; la aplicación no puede importar
  adaptadores.
- `no-restricted-imports` — `domain/` y `application/` no pueden importar
  `@nestjs/*`, `@prisma/client`, `express` ni `multer`.

Las zonas se generan solas: `eslint.config.mjs` lee `src/` en disco y protege
cualquier carpeta que tenga un `domain/` adentro.

## El flujo (fase síncrona)

```
POST /api/regulatory-documents
   │
   ├─1─► RAGFlow  POST /api/v1/datasets/{id}/documents   → document_id
   ├─2─► Postgres INSERT regulatory_documents (PENDING)
   ├─3─► launch(documentId)        ← hoy sólo loguea; acá entra Temporal
   └─4─► 202 Accepted
```

El orden importa: primero RAGFlow, después la fila. Al revés, un fallo de la
subida dejaría filas `PENDING` que no referencian ningún archivo.

## Lo que falta

- **Temporal.** El puerto `DocumentProcessingLauncher` ya existe y el caso de
  uso ya lo llama con el id. Falta el adaptador que haga
  `workflow.start('ProcessRagDoc', { args: [documentId] })`.
- **Credenciales de RAGFlow.** Ver `HUMAN-TASK.md` en la raíz: sin
  `RAGFLOW_API_KEY` y `RAGFLOW_DATASET_ID` el alta devuelve `502`.
- **Lectura de documentos.** Sólo existe el alta; no hay `GET` todavía.
