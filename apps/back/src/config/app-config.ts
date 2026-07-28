/**
 * Constantes de la app. Mismo criterio que el front (`CLAUDE.md` §3): un
 * literal que aparece dos veces o que un no-autor no entendería, se nombra acá.
 */

const BYTES_PER_KIB = 1024;
const KIB_PER_MIB = 1024;
const MAX_UPLOAD_MIB = 20;
const RAGFLOW_TIMEOUT_SECONDS = 120;
const MILLISECONDS_PER_SECOND = 1000;

export const appConfig = {
  name: 'AI Form Creator API',
  globalPrefix: 'api',
} as const;

export const uploadConfig = {
  /** Nombre del campo multipart que espera el endpoint. */
  fieldName: 'file',
  /** Único tipo aceptado: los documentos regulatorios llegan en PDF. */
  allowedMimeType: 'application/pdf',
  /**
   * El archivo viaja en memoria (nunca a disco): el Deployment corre con
   * `readOnlyRootFilesystem: true` y sólo tiene un emptyDir en /tmp. 20 MiB es
   * el techo para que N réplicas concurrentes no se coman el límite de 512Mi.
   */
  maxFileSizeBytes: MAX_UPLOAD_MIB * KIB_PER_MIB * BYTES_PER_KIB,
} as const;

export const httpConfig = {
  /**
   * Subir a RAGFlow es una llamada síncrona que además escribe en su MinIO;
   * con PDFs grandes tarda. Generoso a propósito, pero acotado: sin timeout el
   * request del oficial queda colgado para siempre.
   */
  ragflowTimeoutMs: RAGFLOW_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
} as const;

export const swaggerConfig = {
  path: 'docs',
  title: 'AI Form Creator API',
  description:
    'Ingesta de documentos regulatorios: proxy de subida a RAGFlow, ' +
    'registro en Postgres y arranque del pipeline de procesamiento.',
  version: '0.1.0',
} as const;
