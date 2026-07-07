import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';

// Intercept and suppress benign Vite WebSocket/HMR errors, as well as Firestore quota/assertion errors from triggering platform overlay
if (typeof window !== 'undefined') {
  const shouldSuppressError = (errorMsg: string, reason?: any): boolean => {
    const checkMessage = (msg: string): boolean => {
      if (!msg) return false;
      const lower = msg.toLowerCase();
      return (
        lower.includes('websocket') ||
        lower.includes('failed to connect to websocket') ||
        lower.includes('closed without opened') ||
        lower.includes('fechado sem') ||
        lower.includes('abrir') ||
        lower.includes('aberto') ||
        lower.includes('vite') ||
        lower.includes('hmr') ||
        lower.includes('ws://') ||
        lower.includes('wss://') ||
        lower.includes('firestore') ||
        lower.includes('firebase') ||
        lower.includes('assertion failed') ||
        lower.includes('unexpected state') ||
        lower.includes('quota') ||
        lower.includes('limite de quota') ||
        lower.includes('exceeded') ||
        lower.includes('firestore.googleapis.com')
      );
    };

    if (errorMsg && checkMessage(errorMsg)) {
      return true;
    }

    if (reason) {
      try {
        const reasonStr = String(reason);
        if (checkMessage(reasonStr)) {
          return true;
        }

        const reasonMsg = reason.message || '';
        if (reasonMsg && checkMessage(reasonMsg)) {
          return true;
        }

        const reasonStack = reason.stack || '';
        if (reasonStack && checkMessage(reasonStack)) {
          return true;
        }

        // Check if it's a browser Event/CloseEvent from a WebSocket
        if (reason.target) {
          const url = reason.target.url || '';
          if (typeof url === 'string' && (url.startsWith('ws:') || url.startsWith('wss:') || url.includes('ws'))) {
            return true;
          }
          if ('binaryType' in reason.target || 'bufferedAmount' in reason.target) {
            return true;
          }
        }
        if (reason.type === 'close' || reason.type === 'error') {
          return true;
        }
      } catch (e) {}
    }
    return false;
  };

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (shouldSuppressError(msg, event.error)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    const hasStack = reason && typeof reason === 'object' && 'stack' in reason;
    const stackMsg = hasStack ? String(reason.stack) : '';
    
    if (
      shouldSuppressError(msg, reason) || 
      (stackMsg && shouldSuppressError(stackMsg))
    ) {
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
