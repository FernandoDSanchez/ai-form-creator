import type { QueryClient } from '@tanstack/react-query';
import type { LoaderFunctionArgs } from 'react-router';
import { useParams } from 'react-router';

import { ContentLayout } from '@/components/layouts/content-layout';
import { Spinner } from '@/components/ui/spinner/spinner';
import { DynamicForm } from '@/features/dynamic-form/components/dynamic-form';
import {
  getFormGenerationQueryOptions,
  useFormGeneration,
} from '@/features/form-generation/api/get-form-generation';
import { FormGenerationProgress } from '@/features/form-generation/components/form-generation-progress';
import { FormGenerationReview } from '@/features/form-generation/components/form-generation-review';
import { useFormGenerationStream } from '@/features/form-generation/hooks/use-form-generation-stream';

const FORM_GENERATION_ID_PARAM = 'formGenerationId';

export const clientLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const formGenerationId = params[FORM_GENERATION_ID_PARAM];

    if (formGenerationId) {
      await queryClient.ensureQueryData(
        getFormGenerationQueryOptions(formGenerationId),
      );
    }

    return null;
  };

/**
 * Seguimiento de una solicitud, de punta a punta.
 *
 * Es el otro punto de composición: la vista previa del formulario la renderiza
 * `dynamic-form` y el panel de revisión es de `form-generation`. Se juntan acá
 * porque las features no se ven entre sí (§1) — el panel recibe la vista previa
 * como nodo y no sabe quién la dibujó.
 */
const FormGenerationRoute = () => {
  const params = useParams();
  const formGenerationId = params[FORM_GENERATION_ID_PARAM] ?? '';

  const formGenerationQuery = useFormGeneration({ formGenerationId });

  // Suscribe la pantalla a los cambios de estado. No devuelve nada: sólo
  // mantiene al día lo que lee la query de arriba.
  useFormGenerationStream(formGenerationId);

  const formGeneration = formGenerationQuery.data;

  if (!formGeneration) {
    return (
      <ContentLayout title="Solicitud">
        <Spinner size="lg" />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Solicitud" description={formGeneration.prompt}>
      <div className="gap-lg flex flex-col">
        <FormGenerationProgress formGeneration={formGeneration} />

        {formGeneration.formilySchema ? (
          <FormGenerationReview
            formGeneration={formGeneration}
            preview={
              <DynamicForm
                schema={formGeneration.formilySchema}
                // Es una vista previa: se muestra tal como se vería, pero no se
                // llena ni se envía. Aprobar no es completar el formulario.
                isDisabled
                submitLabel="Vista previa"
                onSubmit={() => undefined}
              />
            }
          />
        ) : null}
      </div>
    </ContentLayout>
  );
};

export default FormGenerationRoute;
