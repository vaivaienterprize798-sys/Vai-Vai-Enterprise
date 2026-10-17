import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { initAutoUpdateListener, forceUpdateAndReloadApp, initLiveVersionWatcher } from './lib/appUpdate';

// Initialize Auto-Update Listener
initAutoUpdateListener();
initLiveVersionWatcher();

// Remove any old service worker + caches so every device always loads the latest version
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  if ('caches' in window) caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
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
