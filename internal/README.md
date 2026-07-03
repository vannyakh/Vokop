# Internal tooling

Shared monorepo configs for Vokop. These packages are workspace-local — not published.

| Package | Purpose |
|---------|---------|
| `@vokop/tsconfig` | Shared TypeScript bases for apps, packages, and services |
| `@vokop/node-utils` | Monorepo helpers (`findMonorepoRoot`, env dir resolution) |
| `@vokop/vite-config` | Shared Vite config factory for React apps (`web`, `admin`) |

## Usage

**TypeScript** — extend in any package `tsconfig.json`:

```json
{
  "extends": "@vokop/tsconfig/react-app.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

**Vite** — in `apps/*/vite.config.ts`:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReactAppViteConfig } from '@vokop/vite-config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createReactAppViteConfig({
  dirname,
  portEnvKey: 'WEB_PORT',
  defaultPort: 3000,
  defineEnv: { 'process.env.GEMINI_API_KEY': 'GEMINI_API_KEY' },
});
```

Previously this folder contained unused [vue-vben-admin](https://github.com/vbenjs/vue-vben-admin) template tooling (Vue ESLint, Nitro mock, commitlint, etc.). That has been removed in favor of the configs above.
