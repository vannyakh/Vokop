/** Paths excluded from format and line check. */
export const DEVTOOLS_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.pnpm-store/**',
  '**/*.min.js',
  '**/pnpm-lock.yaml',
] as const;

/** Source globs scanned when no explicit paths are passed (legacy — prefer workspace discovery). */
export const DEVTOOLS_SOURCE_GLOBS = [
  'apps/*/src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'apps/*/*.{ts,tsx,js,mjs,cjs}',
  'packages/*/src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'services/*/src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'internal/*/src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'internal/*/*.{js,mjs,cjs}',
  'scripts/**/*.{ts,mjs,js}',
] as const;
