/**
 * App constants. Same criterion as the front (`CLAUDE.md` §3): a literal that
 * shows up twice, or that a non-author would not understand, gets named here.
 */

const BYTES_PER_KIB = 1024;
const KIB_PER_MIB = 1024;
const MAX_UPLOAD_MIB = 20;
const RAGFLOW_TIMEOUT_SECONDS = 120;
const MILLISECONDS_PER_SECOND = 1000;
const TEMPORAL_CONNECT_TIMEOUT_SECONDS = 5;
const CHANGE_FEED_RECONNECT_SECONDS = 3;

export const appConfig = {
  name: 'AI Form Creator API',
  globalPrefix: 'api',
} as const;

export const uploadConfig = {
  /** Name of the multipart field the endpoint expects. */
  fieldName: 'file',
  /** The only accepted type: regulatory documents arrive as PDFs. */
  allowedMimeType: 'application/pdf',
  /**
   * The file travels in memory (never to disk): the Deployment runs with
   * `readOnlyRootFilesystem: true` and only has an emptyDir on /tmp. 20 MiB is
   * the ceiling so N concurrent replicas do not eat the 512Mi limit.
   */
  maxFileSizeBytes: MAX_UPLOAD_MIB * KIB_PER_MIB * BYTES_PER_KIB,
} as const;

export const httpConfig = {
  /**
   * Uploading to RAGFlow is a synchronous call that also writes to its MinIO;
   * with large PDFs it takes a while. Generous on purpose, but bounded: without
   * a timeout the officer's request hangs forever.
   */
  ragflowTimeoutMs: RAGFLOW_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
} as const;

export const temporalConfig = {
  /**
   * How long the client waits to connect to the Temporal frontend.
   *
   * Short on purpose: if Temporal is down, the `POST` has to fail fast with a
   * 502 and not leave the officer staring at a spinner. The request is already
   * written as PENDING; what fails is the trigger.
   */
  connectTimeoutMs: TEMPORAL_CONNECT_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
} as const;

export const changeFeedConfig = {
  /**
   * Wait before retrying the `LISTEN` when the connection drops.
   *
   * The listening connection is a long, idle socket: anything cuts it (a
   * Postgres failover, a NAT timeout, a restart of the database pod). Without
   * reconnection the pod stays alive and mute — it passes the probes, serves
   * HTTP, and never emits another event. It is the most treacherous failure on
   * this path, so it is retried forever.
   */
  reconnectDelayMs: CHANGE_FEED_RECONNECT_SECONDS * MILLISECONDS_PER_SECOND,
} as const;

export const swaggerConfig = {
  path: 'docs',
  title: 'AI Form Creator API',
  description:
    'Regulatory document ingestion: upload proxy to RAGFlow, ' +
    'registration in Postgres and start of the processing pipeline.',
  version: '0.1.0',
} as const;
