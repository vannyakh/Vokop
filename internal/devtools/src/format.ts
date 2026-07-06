import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
import { glob } from 'tinyglobby';
import { DEVTOOLS_IGNORES } from './config/ignores.js';
import {
  getPrettierConfigPath,
  getPrettierIgnorePath,
  getPrettierOptions,
} from './config/paths.js';
import { findMonorepoRootFrom, resolveTargets, type ResolveTargetsOptions } from './targets.js';

export interface FormatFileResult {
  filePath: string;
  changed: boolean;
}

export interface FormatOptions extends ResolveTargetsOptions {
  write?: boolean;
}

export interface FormatResult {
  ok: boolean;
  checked: number;
  changed: number;
  files: FormatFileResult[];
}

async function listFiles(targets: string[]): Promise<string[]> {
  const files = new Set<string>();

  for (const target of targets) {
    const matches = await glob(target, {
      ignore: [...DEVTOOLS_IGNORES],
      onlyFiles: true,
      absolute: true,
    });
    for (const match of matches) {
      files.add(match);
    }
  }

  return [...files].sort();
}

async function loadPrettierOptions(): Promise<prettier.Options> {
  const configPath = getPrettierConfigPath();
  const config = await prettier.resolveConfig(configPath);
  return {
    ...getPrettierOptions(),
    ...config,
  };
}

async function formatFile(
  filePath: string,
  options: { write: boolean; prettierOptions: prettier.Options },
): Promise<FormatFileResult> {
  const input = await readFile(filePath, 'utf8');
  const formatted = await prettier.format(input, {
    ...options.prettierOptions,
    filepath: filePath,
  });

  const changed = formatted !== input;
  if (options.write && changed) {
    await writeFile(filePath, formatted, 'utf8');
  }

  return { filePath, changed };
}

/** Format or check formatting with Prettier (programmatic API for dev tools). */
export async function formatProject(options: FormatOptions = {}): Promise<FormatResult> {
  const root = findMonorepoRootFrom(options.cwd);
  const targets = resolveTargets({ ...options, cwd: root, mode: 'format' });
  const files = await listFiles(targets);
  const prettierOptions = await loadPrettierOptions();
  const write = options.write ?? false;

  const results: FormatFileResult[] = [];
  for (const filePath of files) {
    results.push(await formatFile(filePath, { write, prettierOptions }));
  }

  const changed = results.filter((file) => file.changed).length;

  return {
    ok: changed === 0,
    checked: results.length,
    changed,
    files: results.filter((file) => file.changed),
  };
}

export function getPrettierCliArgs(mode: 'write' | 'check', targets?: string[]): string[] {
  const root = findMonorepoRootFrom();
  return [
    mode === 'write' ? '--write' : '--check',
    '--config',
    getPrettierConfigPath(),
    '--ignore-path',
    getPrettierIgnorePath(),
    ...(targets?.length ? targets : resolveTargets({ cwd: root })),
  ];
}
