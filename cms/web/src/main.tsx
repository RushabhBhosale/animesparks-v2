import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ApiError } from './api';
import { ToastProvider } from './ui';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: true, retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2 } } });
createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><ToastProvider><App /></ToastProvider></BrowserRouter></QueryClientProvider></StrictMode>,
);
