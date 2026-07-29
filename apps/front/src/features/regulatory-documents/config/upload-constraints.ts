const BYTES_PER_KIB = 1024;
const KIB_PER_MIB = 1024;
const MAX_UPLOAD_MIB = 20;

export const BYTES_PER_MIB = KIB_PER_MIB * BYTES_PER_KIB;

/**
 * Restricciones del alta. Son un espejo de `uploadConfig` del back
 * (`apps/back/src/config/app-config.ts`): acá sirven para no mandar al usuario
 * a un viaje al servidor que ya sabemos que va a fallar, pero la validación de
 * verdad —la que mira los magic numbers del archivo, no la extensión— la hace
 * el `ParseFilePipe` del controlador. Esto es cortesía, no seguridad.
 *
 * Si el back sube su límite, esto queda desactualizado y nadie se entera: el
 * único síntoma es un 413 que el usuario podría haberse ahorrado. Es el
 * candidato obvio a subir al paquete de contratos cuando haga falta.
 */
export const regulatoryDocumentUpload = {
  /** Nombre del campo multipart que espera el endpoint. */
  fieldName: 'file',
  acceptedMimeType: 'application/pdf',
  acceptedExtension: '.pdf',
  maxFileSizeBytes: MAX_UPLOAD_MIB * BYTES_PER_MIB,
  maxFileSizeLabel: `${MAX_UPLOAD_MIB} MB`,
} as const;

/** Decimales al mostrar el tamaño de un archivo. */
export const FILE_SIZE_FRACTION_DIGITS = 1;
