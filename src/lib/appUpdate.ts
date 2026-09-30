// App Version and Auto-Update Management
export const CURRENT_APP_VERSION = 'v4.3.0';
export const BUILD_TIMESTAMP = '2026-09-30-v4.3';

/**
 * Force clean all browser caches, service workers, and reload the application
 * to guarantee that all latest code changes and new features load immediately.
 * LocalStorage and Firestore data are fully preserved!
 */
export async function forceUpdateAndReloadApp(): Promise<void> {
  console.log('[RSR App Update] Purging stale caches and refreshing app...');
  try {
    // 1. Unregister all Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // 2. Clear CacheStorage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }

    // 3. Mark update version in localStorage
    localStorage.setItem('rsr_installed_version_v1', CURRENT_APP_VERSION);
    localStorage.setItem('rsr_last_updated_at_v1', new Date().toISOString());
  } catch (err) {
    console.warn('[RSR App Update] Cache purge notice:', err);
  }

  // 4. Force reload without cache
  window.location.reload();
}

/**
 * Setup background auto-update checks for PWA / Service Worker
 */
export function initAutoUpdateListener(onUpdateAvailable?: () => void) {
  if (typeof window === 'undefined') return;

  // Store current version and check for upgrade
  const lastVersion = localStorage.getItem('rsr_installed_version_v1');
  if (!lastVersion) {
    localStorage.setItem('rsr_installed_version_v1', CURRENT_APP_VERSION);
  } else if (lastVersion !== CURRENT_APP_VERSION) {
    console.log(`[RSR App Update] Version upgrade detected: ${lastVersion} -> ${CURRENT_APP_VERSION}`);
    localStorage.setItem('rsr_installed_version_v1', CURRENT_APP_VERSION);
    // Purge old cache storage in background so new bundles load fresh
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name !== 'rsr-vaivai-v4.3') {
            caches.delete(name);
          }
        });
      });
    }
    if (onUpdateAvailable) {
      onUpdateAvailable();
    }
  }

  // Service Worker update detection
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Check for update on load
      registration.update().catch(() => {});

      // Check on window focus (e.g. user switches back to app tab or desktop window)
      window.addEventListener('focus', () => {
        registration.update().catch(() => {});
      });

      // Listen for new worker installed
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[RSR PWA] New update ready! Activating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              if (onUpdateAvailable) {
                onUpdateAvailable();
              }
            }
          });
        }
      });
    });

    // Auto reload when controller changes to newly activated worker
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  // Attach to window for emergency access
  (window as unknown as { __rsr_force_update: () => void }).__rsr_force_update = forceUpdateAndReloadApp;
}
