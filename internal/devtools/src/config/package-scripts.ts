/** Shared devtools scripts — add to every workspace package.json. */
export const DEVTOOLS_PKG_SCRIPTS = {
  linecheck: 'pnpm --filter @vokop/devtools exec tsx src/cli/linecheck-pkg.ts "$PWD"',
  'linecheck:fix': 'pnpm --filter @vokop/devtools exec tsx src/cli/linecheck-pkg.ts --fix "$PWD"',
  format: 'pnpm --filter @vokop/devtools exec tsx src/cli/format-pkg.ts --write "$PWD"',
  'format:check': 'pnpm --filter @vokop/devtools exec tsx src/cli/format-pkg.ts --check "$PWD"',
} as const;
