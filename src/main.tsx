import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';

// Intercept and suppress benign Vite WebSocket and HMR errors/rejections from triggering platform overlay
if (typeof window !== 'undefined') {
  const isWebsocketOrViteError = (errorMsg: string): boolean => {
    if (!errorMsg) return false;
    const message = errorMsg.toLowerCase();
    return (
      message.includes('websocket') ||
      message.includes('failed to connect to websocket') ||
      message.includes('closed without opened') ||
      message.includes('vite') ||
      message.includes('hmr')
    );
  };

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (isWebsocketOrViteError(msg)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (isWebsocketOrViteError(msg) || (reason && reason.stack && isWebsocketOrViteError(reason.stack))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
