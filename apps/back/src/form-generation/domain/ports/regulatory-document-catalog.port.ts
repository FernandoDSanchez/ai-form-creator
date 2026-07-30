import type { WorkflowRegulatoryDocument } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';

/**
 * Lo que este contexto necesita saber de los documentos regulatorios: nada más
 * que sus identificadores del lado de RAGFlow.
 *
 * Es un puerto y no un import de `regulatory-documents/` a propósito, y no sólo
 * porque ESLint prohíba el import cruzado: la prohibición está para forzar
 * justamente esta pregunta. Lo que este contexto necesita del otro es una
 * proyección de tres campos, y declararla acá deja escrito ese acuerdo mínimo.
 * El día que la ingesta cambie de motor, lo que se rompe es el adaptador, no
 * este contexto.
 *
 * El adaptador actual lee la tabla del otro contexto directo con Prisma
 * (`infrastructure/persistence/prisma-regulatory-document-catalog.ts`). Es una
 * lectura y nada más; si algún día hiciera falta escribir, esto pasa a ser una
 * llamada a la capa de aplicación del otro contexto.
 */
export type RegulatoryDocumentCatalog = {
  /**
   * Devuelve los que existen. Los que no, simplemente no vienen: comparar
   * contra lo pedido y decidir qué hacer con la diferencia es del caso de uso.
   */
  findByIds(
    regulatoryDocumentIds: readonly string[],
  ): Promise<WorkflowRegulatoryDocument[]>;
};

export const REGULATORY_DOCUMENT_CATALOG = Symbol('RegulatoryDocumentCatalog');
