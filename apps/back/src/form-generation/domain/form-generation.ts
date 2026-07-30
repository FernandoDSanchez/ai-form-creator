/**
 * La puerta del núcleo a la entidad.
 *
 * No se declara acá: vive en `@ai-form-creator/contracts`, el mismo schema que
 * consume el front y con el que el worker valida lo que devuelve el modelo.
 * Este archivo sólo la expone hacia adentro, igual que
 * `regulatory-documents/domain/regulatory-document.ts`.
 *
 * Que el contrato sea compartido no lo vuelve infraestructura: es un paquete
 * sin framework, sin ORM y sin HTTP, así que el dominio puede mirarlo sin
 * romper la regla de dependencias hacia adentro (`CLAUDE.md` §9).
 */
export type {
  FormGeneration,
  NewFormGeneration,
  FormGenerationReview,
} from '@ai-form-creator/contracts/form-generation/form-generation';

export { formGenerationLimits } from '@ai-form-creator/contracts/form-generation/form-generation';
