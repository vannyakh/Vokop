import { fileURLToPath } from 'node:url';
import path from 'node:path';
import prettierConfig from '../../prettier.config.js';

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function getPrettierConfigPath(): string {
  return path.join(packageRoot, 'prettier.config.js');
}

export function getPrettierIgnorePath(): string {
  return path.join(packageRoot, '.prettierignore');
}

export function getPrettierOptions(): Record<string, unknown> {
  return { ...prettierConfig };
}

export function getEslintConfigPath(): string {
  return path.join(packageRoot, 'eslint.config.js');
}
