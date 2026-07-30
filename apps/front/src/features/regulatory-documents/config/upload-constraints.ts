const BYTES_PER_KIB = 1024;
const KIB_PER_MIB = 1024;
const MAX_UPLOAD_MIB = 20;

export const BYTES_PER_MIB = KIB_PER_MIB * BYTES_PER_KIB;

/**
 * Upload constraints. They mirror the back's `uploadConfig`
 * (`apps/back/src/config/app-config.ts`): here they exist to avoid sending the
 * user on a round trip to the server that we already know will fail, but the
 * real validation — the one looking at the file magic numbers, not the
 * extension — is done by the controller's `ParseFilePipe`. This is courtesy,
 * not security.
 *
 * If the back raises its limit, this goes stale and nobody finds out: the only
 * symptom is a 413 the user could have been spared. It is the obvious candidate
 * to move up to the contracts package when needed.
 */
export const regulatoryDocumentUpload = {
  /** Name of the multipart field the endpoint expects. */
  fieldName: 'file',
  acceptedMimeType: 'application/pdf',
  acceptedExtension: '.pdf',
  maxFileSizeBytes: MAX_UPLOAD_MIB * BYTES_PER_MIB,
  maxFileSizeLabel: `${MAX_UPLOAD_MIB} MB`,
} as const;

/** Decimals when displaying a file size. */
export const FILE_SIZE_FRACTION_DIGITS = 1;
