# @vokop/devtools

Shared **format** (Prettier) and **line check** (ESLint) for the Vokop monorepo — all apps, packages, services, and internal tooling.

## CLI (from repo root)

| Script | Action |
|--------|--------|
| `pnpm format` | Prettier write — **all workspace packages** (Turbo) |
| `pnpm format:check` | Prettier check — all packages |
| `pnpm linecheck` | ESLint — all packages |
| `pnpm linecheck:fix` | ESLint auto-fix — all packages |
| `pnpm lint` | TypeScript (`tsc --noEmit`) per package |

Per package (from any app/package dir):

```bash
pnpm linecheck
pnpm format
```

## Coverage

Auto-discovers every workspace package under:

- `apps/*` (web, admin, desktop)
- `packages/*`
- `services/*`
- `internal/*`

Each package is scanned for:

- `src/**` — source (`.ts`, `.tsx`, `.js`, `.json`, `.css`, `.md` for format)
- Root configs — `vite.config.ts`, `electron.vite.config.ts`, `eslint.config.js`, etc.
- `scripts/**` when present
- Repo `scripts/**` and root `eslint.config.js`

## Programmatic API

```ts
import {
  lineCheck,
  formatProject,
  getWorkspacePackageDirs,
  getMonorepoTargetGlobs,
} from '@vokop/devtools';

const packages = getWorkspacePackageDirs();
const lint = await lineCheck(); // entire monorepo
await formatProject({ write: true, paths: ['apps/web'] });
```

## Config exports

- `@vokop/devtools/eslint` — ESLint flat config
- `@vokop/devtools/prettier` — Prettier config
