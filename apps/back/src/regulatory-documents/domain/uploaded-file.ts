/**
 * Archivo que entra al núcleo. Deliberadamente NO es `Express.Multer.File`:
 * el dominio no sabe que del otro lado hay un multipart de Express.
 */
export type UploadedFile = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
};
