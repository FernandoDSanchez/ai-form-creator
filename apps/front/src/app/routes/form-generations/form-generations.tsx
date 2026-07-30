import type { QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { ContentLayout } from '@/components/layouts/content-layout';
import { Spinner } from '@/components/ui/spinner/spinner';
import { paths } from '@/config/paths';
import {
  getFormGenerationsQueryOptions,
  useFormGenerations,
} from '@/features/form-generation/api/get-form-generations';
import { FormGenerationPrompt } from '@/features/form-generation/components/form-generation-prompt';
import { FormGenerationsList } from '@/features/form-generation/components/form-generations-list';
import {
  getRegulatoryDocumentsQueryOptions,
  useRegulatoryDocuments,
} from '@/features/regulatory-documents/api/get-regulatory-documents';

/**
 * Punto de composición de las dos features.
 *
 * El selector de documentos lo dibuja `form-generation`, pero los documentos
 * son de `regulatory-documents`, y dos features no se importan entre sí (§1).
 * Acá se piden y se pasan por props. Es exactamente el caso que la regla tiene
 * en mente: la ruta es la única capa que puede ver a las dos.
 */
export const clientLoader = (queryClient: QueryClient) => async () => {
  // En paralelo: son independientes, y en serie el formulario tardaría en
  // aparecer lo que tarden las dos sumadas.
  await Promise.all([
    queryClient.ensureQueryData(getRegulatoryDocumentsQueryOptions()),
    queryClient.ensureQueryData(getFormGenerationsQueryOptions()),
  ]);

  return null;
};

const FormGenerationsRoute = () => {
  const navigate = useNavigate();
  const documentsQuery = useRegulatoryDocuments();
  const formGenerationsQuery = useFormGenerations();

  return (
    <ContentLayout
      title="Generar un formulario"
      description="Describí qué necesitás y elegí contra qué normas apoyarse."
    >
      <div className="gap-xl flex flex-col">
        <FormGenerationPrompt
          documents={documentsQuery.data ?? []}
          // Al aceptarse el pedido se va derecho al seguimiento: es donde está
          // lo que la persona quiere ver ahora.
          onRequested={(formGeneration) =>
            void navigate(
              paths.formGenerations.detail.getHref(formGeneration.id),
            )
          }
        />

        <section className="gap-md flex flex-col">
          <h2 className="text-content text-base font-semibold">
            Solicitudes recientes
          </h2>
          {formGenerationsQuery.isLoading ? (
            <Spinner size="md" />
          ) : (
            <FormGenerationsList
              formGenerations={formGenerationsQuery.data ?? []}
            />
          )}
        </section>
      </div>
    </ContentLayout>
  );
};

export default FormGenerationsRoute;
