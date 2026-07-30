import type { FormGeneration, NewFormGeneration } from '../form-generation';

/**
 * Puerto de salida hacia el almacén de solicitudes.
 *
 * Sólo lecturas y el alta: **el back no escribe estados**. De PENDING en
 * adelante, quien mueve la fila es el worker de Temporal, y el back se entera
 * por el change feed. Que el puerto no tenga un `updateStatus` no es un
 * olvido — es la regla escrita en el tipo.
 *
 * Adaptador actual: `infrastructure/persistence/prisma-form-generation.repository.ts`.
 */
export type FormGenerationRepository = {
  create(formGeneration: NewFormGeneration): Promise<FormGeneration>;
  findById(formGenerationId: string): Promise<FormGeneration | null>;
  findAll(): Promise<FormGeneration[]>;
};

export const FORM_GENERATION_REPOSITORY = Symbol('FormGenerationRepository');
