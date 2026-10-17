import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { initAutoUpdateListener, forceUpdateAndReloadApp } from './lib/appUpdate';

// Initialize Auto-Update Listener
initAutoUpdateListener();

// Register the service worker so the app can be installed on mobile (Add to Home Screen).
// It is network-first, so every device still loads the latest version when online.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => console.warn('SW register failed:', err));
  });
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
