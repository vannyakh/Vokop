import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV_PORTS } from '@vokop/shared/config/ports';
import { createReactAppViteConfig } from '@vokop/vite-config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createReactAppViteConfig({
  dirname,
  portEnvKey: 'ADMIN_PORT',
  defaultPort: DEV_PORTS.admin,
});
