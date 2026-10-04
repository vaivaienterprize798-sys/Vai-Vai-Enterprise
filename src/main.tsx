import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { initAutoUpdateListener, forceUpdateAndReloadApp } from './lib/appUpdate';

// Initialize Auto-Update Listener
initAutoUpdateListener();

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
    // In production, register the service worker for PWA & offline support with immediate update check
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[RSR PWA] Service worker registered successfully:', reg.scope);
          // Check for update on start
          reg.update().catch(() => {});
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
    forceUpdateAndReloadApp();
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
