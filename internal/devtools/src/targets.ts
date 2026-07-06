import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findMonorepoRoot } from '@vokop/node-utils';
import { getMonorepoTargetGlobs, getPackageTargetGlobs } from './workspace.js';

export interface ResolveTargetsOptions {
  cwd?: string;
  paths?: string[];
  mode?: 'linecheck' | 'format';
}

/** Default monorepo source targets for format / line check. */
export function getDefaultTargetGlobs(
  cwd: string = process.cwd(),
  mode: 'linecheck' | 'format' = 'linecheck',
): string[] {
  const root = findMonorepoRoot(cwd);
  return getMonorepoTargetGlobs(root, mode);
}

/** Resolve CLI paths relative to the monorepo root. */
export function resolveTargets(options: ResolveTargetsOptions = {}): string[] {
  const cwd = options.cwd ?? process.cwd();
  const root = findMonorepoRoot(cwd);
  const mode = options.mode ?? 'linecheck';

  if (!options.paths?.length) {
    return getDefaultTargetGlobs(root, mode);
  }

  const globs: string[] = [];

  for (const entry of options.paths) {
    let resolved = entry.startsWith('/') ? entry : join(root, entry);
    if (!existsSync(resolved)) {
      resolved = join(cwd, entry);
    }

    if (!existsSync(resolved)) {
      globs.push(join(root, entry));
      continue;
    }

    if (statSync(resolved).isDirectory()) {
      globs.push(...getPackageTargetGlobs(resolved, mode));
      continue;
    }

    globs.push(resolved);
  }

  return globs;
}

export function findMonorepoRootFrom(cwd?: string): string {
  return findMonorepoRoot(cwd ?? process.cwd());
}

export { toRepoRelativePath } from './workspace.js';
