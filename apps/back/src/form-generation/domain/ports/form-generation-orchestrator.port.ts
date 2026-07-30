import type { FormGenerationReview } from '@ai-form-creator/contracts/form-generation/form-generation';
import type { GenerateFormWorkflowInput } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';

/**
 * Puerto de salida hacia quien orquesta el pipeline.
 *
 * El nombre no menciona a Temporal (`CLAUDE.md` §9): el núcleo pide que alguien
 * arranque la generación y que le acerque el veredicto humano; con qué motor
 * pasa eso lo decide `form-generation.module.ts`.
 *
 * `submitReview` está acá y no en el repositorio porque la revisión no es una
 * escritura: es destrabar un workflow que está detenido esperándola. Quien
 * escribe el APPROVED/REJECTED en la base sigue siendo el worker, con lo cual
 * hay un solo dueño de los estados y el evento de WebSocket sale por el mismo
 * camino que todos los demás.
 */
export type FormGenerationOrchestrator = {
  start(input: GenerateFormWorkflowInput): Promise<void>;
  submitReview(
    formGenerationId: string,
    review: FormGenerationReview,
  ): Promise<void>;
};

export const FORM_GENERATION_ORCHESTRATOR = Symbol(
  'FormGenerationOrchestrator',
);
