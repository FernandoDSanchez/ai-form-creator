import { appConfig } from '@/config/app-config';

import {
  BYTES_PER_MIB,
  FILE_SIZE_FRACTION_DIGITS,
} from '../config/upload-constraints';

const sizeFormatter = new Intl.NumberFormat(appConfig.locale, {
  maximumFractionDigits: FILE_SIZE_FRACTION_DIGITS,
});

/** Bytes -> "2,4 MB". Los documentos regulatorios son PDFs, siempre en MB. */
export const formatFileSize = (sizeBytes: number) =>
  `${sizeFormatter.format(sizeBytes / BYTES_PER_MIB)} MB`;
