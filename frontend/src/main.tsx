import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { router } from '@/app/routes';
import { store } from '@/app/store';
import '@/lib/i18n';
import '@/index.css';

async function enableMocking(): Promise<void> {
  // When VITE_API_BASE_URL is set we talk to a real backend, so skip MSW.
  if (import.meta.env.VITE_API_BASE_URL) return;
  if (!import.meta.env.DEV) return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

void enableMocking().then(() => {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element #root not found');
  createRoot(rootEl).render(
    <StrictMode>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </StrictMode>,
  );
});
