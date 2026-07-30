import { Button } from '@/components/ui/button/button';

export const MainErrorFallback = () => (
  <div
    className="gap-md flex h-screen w-screen flex-col items-center justify-center"
    role="alert"
  >
    <h1 className="text-danger text-lg font-semibold">
      Oops, something went wrong :(
    </h1>
    <Button variant="secondary" onClick={() => window.location.assign('/')}>
      Reload
    </Button>
  </div>
);
