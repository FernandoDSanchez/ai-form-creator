import { AppLayout } from '@/components/layouts/app-layout';
import { Link } from '@/components/ui/link/link';
import { appConfig } from '@/config/app-config';
import { paths } from '@/config/paths';

const LandingRoute = () => (
  <AppLayout>
    <section className="mx-auto max-w-prose text-center">
      <h1 className="text-content text-3xl font-semibold">{appConfig.name}</h1>
      <p className="text-content-muted mt-md text-base">
        {appConfig.description} Los formularios se describen con un JSON Schema
        y se renderizan con Formily, sin escribir un componente por formulario.
      </p>
      <Link to={paths.forms.root.getHref()} className="mt-lg inline-block">
        Ver formularios →
      </Link>
    </section>
  </AppLayout>
);

export default LandingRoute;
