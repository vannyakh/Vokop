import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV_PORTS } from '@vokop/shared/config/ports';
import { createReactAppViteConfig } from '@vokop/vite-config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createReactAppViteConfig({
  dirname,
  portEnvKey: 'WEB_PORT',
  defaultPort: DEV_PORTS.web,
  defineEnv: {
    'process.env.GEMINI_API_KEY': 'GEMINI_API_KEY',
  },
  optimizeDeps: {
    // ffmpeg wasm and omnitool WebCodecs workers must stay external (can't be pre-bundled)
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@omnimedia/omnitool'],
    // No explicit includes needed — Vite resolves transitive CJS deps automatically
    // when omnitool is excluded. Add entries here only if a specific CJS/ESM interop
    // issue resurfaces (check browser console for "does not provide an export named 'default'").
    include: [],
  },
});
