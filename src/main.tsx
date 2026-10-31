import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './app/App';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 2, refetchOnWindowFocus: true },
    mutations: { retry: 1 },
  },
});

async function enableMockApi(): Promise<void> {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', serviceWorker: { url: '/mockServiceWorker.js' } });
}

async function bootstrap(): Promise<void> {
  try {
    await enableMockApi();
  } catch (error) {
    console.warn('Mock API service worker could not start. Record screens will expose their network error state.', error);
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element was not found.');
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();

