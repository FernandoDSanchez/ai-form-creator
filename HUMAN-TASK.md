# HUMAN-TASK — ai-form-creator

Cosas que requieren decisión, credenciales o acceso humano. Marca al completar.

## Pendientes

- [ ] **Credenciales de RAGFlow para el backend.** `apps/back` ya hace el proxy
      de subida, pero necesita dos valores que sólo se obtienen con la UI
      levantada. Sin ellos el pod **no arranca** (la validación de
      `src/config/env.ts` es estricta a propósito) y, en local, el `POST`
      devuelve `502`:
  1. `RAGFLOW_API_KEY` en `iac/…/secrets/back.env` — generada desde la UI de
     RAGFlow (_API_ → _API key_). Una key por consumidor: la del back es
     distinta de la de `ragflow.env`.
  2. `RAGFLOW_DATASET_ID` en el `back-config` de
     `iac/…/ai-form-creator/kustomization.yaml` — el dataset donde aterrizan
     los documentos regulatorios. Va en el ConfigMap porque es un id, no un
     secreto. Se lista con:
     ```bash
     curl -H "Authorization: Bearer $RAGFLOW_API_KEY" \
          http://ragflow:9380/api/v1/datasets
     ```
     Verificado que el resto del camino funciona: con la key placeholder,
     RAGFlow responde `401` y el back lo traduce a `502`.

- [ ] **Registry de imágenes.** Las dos imágenes ya construyen y los
      manifiestos apuntan a ellas por nombre local; el deploy se hace
      importándolas a mano al containerd de k3s (`docker save … | sudo k3s ctr
      images import -`, ver «Imágenes» en `iac/README.md`). Eso ata el deploy a
      la máquina que las construyó y pide `sudo` cada vez. Falta elegir
      registry: en `iac/README.md` («Pendiente») quedaron evaluados ghcr.io y
      el registry que ya corre en el cluster, con lo que cuesta cada uno.

- [ ] **Credenciales del worker de Temporal.** `apps/worker` ya existe y
      orquesta la generación de formularios, pero necesita tres valores en
      `iac/…/secrets/worker.env` (plantilla en `worker.env.example`). Sin ellos
      el pod **no arranca**: la validación de `src/config/env.ts` es estricta a
      propósito, igual que la del back.
  1. `LITELLM_API_KEY` — virtual key propia del worker, creada con
     `LITELLM_MASTER_KEY`. Una por consumidor: distinta de la del back y de la
     de RAGFlow, así se rotan por separado y el gasto se atribuye solo.
     ```bash
     kubectl -n ai-form-creator exec deploy/litellm -- \
       curl -s -X POST http://localhost:4000/key/generate \
         -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
         -H 'Content-Type: application/json' \
         -d '{"models":["gemini/gemini-flash-latest"],"key_alias":"worker"}'
     ```
  2. `RAGFLOW_API_KEY` — la misma historia que la del back, pero key propia.
  3. `DATABASE_URL` — el mismo Postgres que el back (`app-postgres`). El worker
     sólo escribe estados; las migraciones las sigue corriendo el back.

     El modelo va en el ConfigMap `worker-config` (`LITELLM_MODEL`), no en el
     secret: no es secreto y cambiarlo no debería ser un despliegue de imagen.
     Tiene que estar dado de alta en `configs/litellm-config.yaml`.

- [ ] **Imagen del worker.** Se construye como las otras dos, desde la raíz del
      repo, pero **no es Alpine** — el SDK de Temporal trae su núcleo en Rust y
      sólo publica prebuilds para glibc; sobre musl la imagen construye entera y
      revienta al arrancar.
  ```bash
  docker build -t ai-form-creator/worker:dev -f apps/worker/Dockerfile .
  docker save ai-form-creator/worker:dev | sudo k3s ctr images import -
  ```

- [ ] **Procesamiento de documentos en Temporal.** La generación de formularios
      ya corre en `apps/worker`, pero la ingesta no: el puerto
      `DocumentProcessingLauncher` sigue tapado por un adaptador que sólo
      loguea, así que los documentos quedan en `PENDING` para siempre y RAGFlow
      no devuelve chunks. Los formularios se generan igual, apoyados sólo en el
      pedido y el vocabulario — con menos contexto del que el usuario cree que
      dio. Falta el workflow `ProcessRagDoc` (puede vivir en el mismo worker,
      en otra task queue) y el adaptador que lo arranca.

- [ ] **Frontend contra el backend real.** Hoy la API del front vive en
      `src/testing/mocks/`. Cuando exista el servicio:
  1. Poner `VITE_APP_API_URL=https://…` en `.env`.
  2. Poner `VITE_APP_ENABLE_API_MOCKING=false`.
  3. Verificar que el contrato coincide con `FormTemplate` en
     `src/features/dynamic-form/types/form-template.ts`
     (`GET /form-templates`, `GET /form-templates/:id`,
     `POST /form-templates/:id/responses`).
- [x] **Generación de schemas con IA.** Resuelto: la generación ocurre en
      `apps/worker`, orquestada por Temporal y contra LiteLLM. Ninguna API key
      llega al cliente. El front manda el prompt, escucha el avance por
      WebSocket y aprueba el resultado; el JSON de Formily lo compila el worker
      a partir de un borrador con vocabulario cerrado (`packages/contracts`).
- [ ] **Autenticación.** No hay login. bulletproof-react usa
      `react-query-auth` + `ProtectedRoute`; si se necesita, se añade en
      `src/lib/auth.tsx` y se envuelve el router.
- [ ] **Tipografía Inter.** `--font-sans` la referencia pero no se carga ninguna
      webfont. Decidir: self-host en `public/fonts` (preferible) o fallback del
      sistema (comportamiento actual).
- [ ] **Favicon y branding.** `public/favicon.svg` es el placeholder de Vite.
- [ ] **Modo oscuro.** Los tokens semánticos ya lo permiten; falta decidir si se
      hace con `prefers-color-scheme`, con toggle (`storageKeys.theme` ya está
      previsto) o ambos.
- [ ] **CI.** Los hooks de git corren local. Falta pipeline que ejecute
      `lint`, `check-types`, `test` y `build` en cada PR.
- [ ] **RAGFlow ↔ LiteLLM: los dos pasos que no puede hacer el manifiesto.** El
      cableado ya está en
      `iac/k8s/namespaces/ai-form-creator/patches/ragflow-litellm-patch.yaml`
      (bloque `user_default_llm` → `http://litellm:4000/v1`), pero falta:
  1. Crear una virtual key en LiteLLM (con `LITELLM_MASTER_KEY`) y pegarla en
     `secrets/ragflow.env` → `LITELLM_API_KEY`. Misma historia que la de
     `back.env`: una key por consumidor, así se rotan por separado.
  2. Registrar el proveedor una vez desde la UI de RAGFlow: _Model providers_ →
     **OpenAI-API-Compatible**, base URL `http://litellm:4000/v1`, esa virtual
     key, y dar de alta los modelos `gemini/gemini-flash-latest` (chat) y
     `gemini/gemini-embedding-001` (embedding).

     Por qué hace falta si ya está en el config: en la v0.26.4 que corre el
     Deployment, `user_default_llm` sólo preselecciona los **nombres** de modelo
     del tenant nuevo — la línea que creaba las filas con la credencial
     (`TenantLLMService.insert_many`) está comentada upstream en
     `api/db/joint_services/user_account_service.py`. Sin el alta manual, el
     modelo queda elegido pero responde `Model(...) not authorized`.

## Notas

- `.env` existe en local y está en `.gitignore`; `.env.example` es la plantilla
  versionada. Ninguna variable actual es secreta.
- La carpeta `ragflow/` es un checkout independiente que ya estaba en este
  directorio; está excluida de git, ESLint, Prettier y Vitest.
