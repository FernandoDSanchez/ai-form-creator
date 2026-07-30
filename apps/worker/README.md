# `@ai-form-creator/worker`

Worker de [Temporal](https://temporal.io). Es el único proceso que le habla al
modelo y el único que mueve el estado de una generación de formulario.

No escucha en ningún puerto: toma trabajo de la cola `form-generation` y escribe
en `app-postgres`. Si se cae, los workflows en vuelo no se pierden — otro worker
toma la tarea donde quedó.

## El pipeline

```
                                     ┌──────────────────────────┐
POST /form-generations ──► back ─────► cola `form-generation`   │
   (fila en PENDING)                  └───────────┬──────────────┘
                                                  │
                    ┌─────────────────────────────▼─────────────────────────┐
                    │ generateForm (workflow)                               │
                    │                                                       │
                    │  RETRIEVING   retrieveRegulatoryContext  → RAGFlow    │
                    │      │                                                │
                    │      ▼        ┌─────────────────────────────┐         │
                    │  GENERATING   │ requestFormDraft → LiteLLM  │         │
                    │      │        │ validateFormDraft (schema)  │ ×3      │
                    │  VALIDATING   │   ¿no valida? → REPAIRING,  │         │
                    │      │        │   con los errores adentro   │         │
                    │      ▼        └─────────────────────────────┘         │
                    │  AWAITING_REVIEW  ◄── el workflow se detiene acá      │
                    │      │                                                │
                    │      │  señal `review` (la manda el back)             │
                    │      ▼                                                │
                    │  APPROVED / REJECTED                                  │
                    └───────────────────────────────────────────────────────┘
                                        │
       cada cambio de estado ──► UPDATE ──► trigger ──► pg_notify
                                                            │
                                          back (LISTEN) ──► WebSocket ──► front
```

**La IA nunca publica sola.** Toda generación se detiene en `AWAITING_REVIEW` y
espera a una persona. Es la razón de que esto sea un workflow durable y no un
`POST` que espera: la espera puede durar días y tiene que sobrevivir a
despliegues.

## Arquitectura

```
src/
├── config/       # env + ajustes de los adaptadores. Sólo lo lee worker.ts y activities/
├── domain/       # puro: prompt, validación, compilador a Formily. Cero IO
│   └── ports/    # lo que el workflow necesita del mundo, como tipo
├── activities/   # el único lugar con red y base de datos
├── workflows/    # determinista; sólo orquesta
└── worker.ts     # raíz de composición
```

Las capas están **forzadas por ESLint** (`eslint.config.mjs`), igual que en las
otras dos apps. Y no es un gusto: se las impone Temporal.

El código de un workflow corre en un sandbox determinista y se **reejecuta de
cero** cada vez que el worker se reinicia o se reemplaza. Ahí adentro no hay
red, ni disco, ni `process.env`, y cualquier cosa que dé un resultado distinto
en la segunda corrida rompe la ejecución. Un import equivocado no falla al
compilar: falla en producción, en una reejecución, con un `Nondeterminism error`
a los tres días.

De ahí salen las tres reglas:

| Desde ↓ / Hacia → | `domain` | `activities` | `config` | `pg`, `node:*` |
| ----------------- | :------: | :----------: | :------: | :------------: |
| `domain`          |    ✅    |      ❌      |    ❌    |       ❌       |
| `workflows`       |    ✅    |      ❌      |    ❌    |       ❌       |
| `activities`      |    ✅    |      ✅      |    ✅    |       ✅       |

El workflow no puede importar `activities/`, así que habla con ellas por un
puerto (`domain/ports/form-generation-activities.port.ts`) que resuelve
`proxyActivities`. Es la misma inversión de dependencias que el back, y acá
además es lo que Temporal quiere.

### Por qué la validación es una actividad

`validateGeneratedForm` es una función pura: no toca nada de afuera y podría
llamarse derecho desde el workflow. Está envuelta en una actividad igual, y el
motivo es la espera de revisión.

Un workflow puede quedarse 30 días detenido, y en esos 30 días se va a desplegar
código nuevo. Al reejecutarse, todo lo que esté **en** el workflow corre otra vez
con la versión nueva; si para entonces el schema cambió y lo que antes validaba
ahora no, el workflow tomaría un camino distinto al que ya está grabado en el
historial y Temporal lo mataría. El resultado de una actividad, en cambio, queda
grabado: se relee, no se recalcula.

## Comandos

| Comando               | Qué hace                               |
| --------------------- | -------------------------------------- |
| `npm run dev`         | Worker con `ts-node`, contra el `.env` |
| `npm run lint`        | ESLint con 0 tolerancia a warnings     |
| `npm run check-types` | `tsc --noEmit`                         |
| `npm test`            | Jest (dominio puro, sin red ni base)   |
| `npm run build`       | `tsc` a `dist/`                        |

En un clone nuevo hay que compilar los contratos antes: `npm run contracts:build`.

## Cosas que muerden

**No uses Alpine.** El SDK de Temporal trae su núcleo en Rust como binario
nativo y sólo publica prebuilds para glibc. Sobre musl `npm ci` no falla y la
imagen construye entera; lo que revienta es el arranque, con un error de módulo
nativo que no menciona a musl por ningún lado. Por eso el `Dockerfile` usa
`node:24-bookworm-slim` y no `node:24-alpine` como las otras dos.

**El esquema de la base no es de acá.** Lo gobierna
`apps/back/prisma/schema.prisma` y las migraciones las corre el back. El worker
sólo escribe, con SQL a mano, y todos los nombres de tabla y columna viven en
`activities/form-generation-store.ts`. Si la tabla cambia, cambia ese archivo.

**`updated_at` se escribe a mano.** En el esquema es `@updatedAt`, que Prisma
resuelve en el cliente: la columna no tiene trigger ni default. Como el worker
no pasa por Prisma, si no la tocara se quedaría con la hora del alta durante
todo el pipeline.

**El bundle del workflow pesa ~2.6 MB** porque los módulos de contratos que
importa declaran schemas de TypeBox, y el build CJS no se puede sacudir como el
ESM que consume el front. Se paga una vez al arrancar el worker (con
`reuseV8Context`, que es el default, el contexto se comparte entre workflows).
Partir el paquete en «constantes» y «schemas» lo arreglaría a costa de duplicar
un archivo por concepto; hoy no vale la pena.

## Ver qué está pasando

La UI de Temporal muestra cada workflow, en qué actividad está, cuántas veces se
reintentó y con qué error. Es el lugar donde mirar cuando una generación se
queda trabada:

```
kubectl -n ai-form-creator port-forward svc/temporal-ui-svc 8080:8080
```

o el Ingress que ya está puesto (`temporal.<host>`).
