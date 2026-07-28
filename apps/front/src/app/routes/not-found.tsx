import { AppLayout } from '@/components/layouts/app-layout';
import { Link } from '@/components/ui/link/link';
import { paths } from '@/config/paths';

const NotFoundRoute = () => (
  <AppLayout>
    <div className="text-center">
      <h1 className="text-content text-2xl font-semibold">
        404 — Página no encontrada
      </h1>
      <Link to={paths.home.getHref()} className="mt-md inline-block">
        Volver al inicio
      </Link>
    </div>
  </AppLayout>
);

export default NotFoundRoute;
