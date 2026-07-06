import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findMonorepoRoot } from '@vokop/node-utils';

/** Workspace roots from pnpm-workspace.yaml. */
export const WORKSPACE_ROOTS = ['apps', 'packages', 'services', 'internal'] as const;

export const CODE_FILE_GLOB = '*.{ts,tsx,js,jsx,mjs,cjs}';
export const FORMAT_FILE_GLOB = '*.{ts,tsx,js,jsx,mjs,cjs,json,css,md}';

/** List every workspace package directory (has package.json). */
export function getWorkspacePackageDirs(root: string = findMonorepoRoot()): string[] {
  const dirs: string[] = [];

  for (const workspaceRoot of WORKSPACE_ROOTS) {
    const workspacePath = join(root, workspaceRoot);
    if (!existsSync(workspacePath)) continue;

    for (const entry of readdirSync(workspacePath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const packageDir = join(workspacePath, entry.name);
      if (existsSync(join(packageDir, 'package.json'))) {
        dirs.push(packageDir);
      }
    }
  }

  return dirs.sort();
}

export function getPackageTargetGlobs(
  packageDir: string,
  mode: 'linecheck' | 'format' = 'linecheck',
): string[] {
  const ext = mode === 'format' ? FORMAT_FILE_GLOB : CODE_FILE_GLOB;
  return [
    join(packageDir, 'src', '**', ext),
    join(packageDir, ext),
    join(packageDir, 'scripts', '**', ext),
  ];
}

/** All monorepo targets for line check or format. */
export function getMonorepoTargetGlobs(
  root: string = findMonorepoRoot(),
  mode: 'linecheck' | 'format' = 'linecheck',
): string[] {
  const packages = getWorkspacePackageDirs(root);
  const globs = packages.flatMap((dir) => getPackageTargetGlobs(dir, mode));

  return [
    ...globs,
    join(root, 'scripts', '**', CODE_FILE_GLOB),
    join(root, 'eslint.config.js'),
    join(root, 'internal', 'devtools', '**', CODE_FILE_GLOB),
  ];
}

/** Resolve a package directory to a repo-relative path. */
export function toRepoRelativePath(target: string, root: string = findMonorepoRoot()): string {
  const absolute = target.startsWith('/') ? target : join(root, target);
  const rel = relative(root, absolute);
  return rel || '.';
}

/** Current package directory when invoked from a workspace package script. */
export function getCallerPackageDir(argv: string[] = process.argv.slice(2)): string {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  return positional[0] ?? process.env.PWD ?? process.cwd();
}
