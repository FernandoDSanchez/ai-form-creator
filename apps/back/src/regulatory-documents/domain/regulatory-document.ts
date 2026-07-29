/**
 * Entidad de dominio del documento regulatorio.
 *
 * La definición no vive acá sino en `@ai-form-creator/contracts`, porque es la
 * misma que consume el front: un solo schema TypeBox, dos apps. Este archivo
 * queda como la puerta del dominio — el resto del contexto sigue importando
 * `../domain/regulatory-document` y no se entera de dónde salió el tipo.
 *
 * Que el contrato sea compartido no lo convierte en infraestructura: es un
 * paquete sin framework, sin ORM y sin HTTP, así que el núcleo puede mirarlo
 * sin romper la regla de dependencias hacia adentro (`CLAUDE.md` §9).
 *
 * Ojo con las fechas: `createdAt` y `updatedAt` son string ISO 8601, no
 * `Date`. Es lo que viaja por JSON, y el `Date` de Prisma se convierte una
 * sola vez, en `infrastructure/persistence/regulatory-document.mapper.ts`.
 */
export {
  regulatoryDocumentSchema,
  newRegulatoryDocumentSchema,
  type RegulatoryDocument,
  type NewRegulatoryDocument,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';
