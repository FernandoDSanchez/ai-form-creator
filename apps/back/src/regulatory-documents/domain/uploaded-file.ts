/**
 * A file entering the core. Deliberately NOT `Express.Multer.File`: the domain
 * does not know there is an Express multipart on the other side.
 */
export type UploadedFile = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
};
