// App Version and Auto-Update Management
export const CURRENT_APP_VERSION = 'v4.4.0';
export const BUILD_TIMESTAMP = '2026-10-17-v4.4.0';

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

/** Script/style file names inside index.html change on every new build. */
function buildSignature(html: string): string {
  return (html.match(/\/assets\/[^"']+\.(?:js|css)/g) || []).sort().join('|');
}

/**
 * Live version watcher: checks the published index.html every few minutes and when
 * the app comes back into focus. If a new build was published it clears the old cache
 * and reloads, so every installed app (laptop / mobile) updates by itself.
 * Data in localStorage and the cloud is never touched.
 */
export function initLiveVersionWatcher(intervalMs: number = 3 * 60 * 1000): void {
  if (typeof window === 'undefined' || !import.meta.env.PROD) return;
  let current = '';
  let busy = false;
  const check = async () => {
    if (busy || !navigator.onLine) return;
    busy = true;
    try {
      const res = await fetch('/index.html?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const sig = buildSignature(await res.text());
      if (!sig) return;
      if (!current) {
        // First check: compare with the scripts this page actually loaded
        const loaded = Array.from(document.querySelectorAll('script[src],link[rel="stylesheet"][href]'))
          .map((el) => (el.getAttribute('src') || el.getAttribute('href') || '').replace(/^.*?(\/assets\/)/, '$1'))
          .filter((u) => u.startsWith('/assets/')).sort().join('|');
        current = loaded || sig;
      }
      if (sig !== current) {
        console.log('[RSR App Update] New version published, updating...');
        await forceUpdateAndReloadApp();
      }
    } catch {
      /* offline or network notice: try again later */
    } finally {
      busy = false;
    }
  };
  setTimeout(check, 15000);
  setInterval(check, intervalMs);
  window.addEventListener('focus', () => { check(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
