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
    // ffmpeg wasm must stay external; pixi/eventemitter3 need prebundle for CJS default interop
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    include: [
      'eventemitter3',
      'pixi.js',
      '@omnimedia/omnitool',
    ],
  },
});
