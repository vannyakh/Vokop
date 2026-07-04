/*! coi-serviceworker (Vokop-patched) — based on v0.1.7 MIT
 * Patches:
 * - Do not intercept /api/* (Vite proxy / gateway)
 * - Do not intercept Vite client paths (/@vite, /@fs, /src, /node_modules)
 * - Return a real Response on fetch failure (avoid opaque "404 from service worker")
 */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('message', (ev) => {
    if (!ev.data) return;
    if (ev.data.type === 'deregister') {
      self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
    } else if (ev.data.type === 'coepCredentialless') {
      coepCredentialless = ev.data.value;
    }
  });

  self.addEventListener('fetch', (event) => {
    const r = event.request;
    const url = new URL(r.url);

    // Never wrap API or Vite-dev traffic — pass through to the network/proxy.
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/@') ||
      url.pathname.startsWith('/src/') ||
      url.pathname.startsWith('/node_modules/') ||
      url.pathname.includes('.vite/')
    ) {
      return;
    }

    if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') {
      return;
    }

    const request =
      coepCredentialless && r.mode === 'no-cors'
        ? new Request(r, { credentials: 'omit' })
        : r;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) return response;

          const newHeaders = new Headers(response.headers);
          newHeaders.set(
            'Cross-Origin-Embedder-Policy',
            coepCredentialless ? 'credentialless' : 'require-corp',
          );
          if (!coepCredentialless) {
            newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
          }
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((err) => {
          console.error('[coi-sw]', err);
          return new Response(String(err), {
            status: 502,
            statusText: 'Bad Gateway',
            headers: { 'Content-Type': 'text/plain' },
          });
        }),
    );
  });
} else {
  (() => {
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    const coi = {
      // Dev: Vite already sets COOP/COEP headers — do not register SW.
      shouldRegister: () => !isLocal,
      shouldDeregister: () => isLocal,
      coepCredentialless: () => true,
      doReload: () => window.location.reload(),
      quiet: true,
      ...window.coi,
    };

    const n = navigator;

    if (n.serviceWorker && n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({
        type: 'coepCredentialless',
        value: coi.coepCredentialless(),
      });

      if (coi.shouldDeregister()) {
        n.serviceWorker.controller.postMessage({ type: 'deregister' });
      }
    }

    if (window.crossOriginIsolated !== false || !coi.shouldRegister()) return;

    if (!window.isSecureContext) {
      if (!coi.quiet) {
        console.log('COOP/COEP Service Worker not registered, a secure context is required.');
      }
      return;
    }

    if (n.serviceWorker) {
      n.serviceWorker.register(window.document.currentScript.src).then(
        (registration) => {
          if (!coi.quiet) {
            console.log('COOP/COEP Service Worker registered', registration.scope);
          }

          registration.addEventListener('updatefound', () => {
            if (!coi.quiet) {
              console.log('Reloading page to make use of updated COOP/COEP Service Worker.');
            }
            coi.doReload();
          });

          if (registration.active && !n.serviceWorker.controller) {
            if (!coi.quiet) {
              console.log('Reloading page to make use of COOP/COEP Service Worker.');
            }
            coi.doReload();
          }
        },
        (err) => {
          if (!coi.quiet) {
            console.error('COOP/COEP Service Worker failed to register:', err);
          }
        },
      );
    }
  })();
}
