import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Service Worker management: active only in production, clean & unregister in dev
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In dev mode, immediately unregister any service worker and purge caches
    // to prevent stale React chunk collisions and "Invalid hook call" errors
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  } else {
    // In production, register the service worker for PWA & offline support
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[RSR PWA] Service worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[RSR PWA] Service worker registration notice:', err);
        });
    });
  }
}

// Self-healing handler for desktop PWA stale chunks or dynamic import failures
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk')
  ) {
    console.warn('Detected stale module chunk failure. Recovering cache & reloading...');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
          window.location.reload();
        });
      });
    } else {
      window.location.reload();
    }
  }
});

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
