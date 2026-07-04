import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV_PORTS } from '@vokop/shared/config/ports';
import { createReactAppViteConfig } from '@vokop/vite-config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createReactAppViteConfig({
  dirname,
  portEnvKey: 'WEB_PORT',
  defaultPort: DEV_PORTS.web,
  // Enables SharedArrayBuffer for @ffmpeg/ffmpeg without a service worker in dev.
  serverHeaders: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@omnimedia/omnitool'],
    include: ['gl-transitions', 'opfs-tools'],
  },
});
