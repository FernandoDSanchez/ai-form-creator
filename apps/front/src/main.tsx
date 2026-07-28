import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/index';
import { env } from '@/config/env';

import './styles/index.css';

const enableApiMocking = async () => {
  if (!env.ENABLE_API_MOCKING) return;

  const { worker } = await import('@/testing/mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No se encontró el elemento #root en index.html');
}

enableApiMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
