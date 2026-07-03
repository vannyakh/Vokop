import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Walk up from `cwd` until a pnpm monorepo root is found. */
export function findMonorepoRoot(cwd: string = process.cwd()): string {
  let currentDir = resolve(cwd);

  while (true) {
    if (existsSync(join(currentDir, 'pnpm-lock.yaml'))) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return resolve(cwd);
    }

    currentDir = parentDir;
  }
}

/** Load `.env` files from the monorepo root (same directory Vite uses as envDir). */
export function getMonorepoEnvDir(fromDir: string): string {
  return findMonorepoRoot(fromDir);
}
