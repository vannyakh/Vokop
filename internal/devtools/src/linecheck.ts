import { ESLint } from 'eslint';
import { getEslintConfigPath } from './config/paths.js';
import { resolveTargets, type ResolveTargetsOptions } from './targets.js';

export interface LineCheckMessage {
  ruleId: string | null;
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
}

export interface LineCheckFileResult {
  filePath: string;
  messages: LineCheckMessage[];
  errorCount: number;
  warningCount: number;
}

export interface LineCheckOptions extends ResolveTargetsOptions {
  fix?: boolean;
}

export interface LineCheckResult {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  files: LineCheckFileResult[];
}

function mapResult(result: ESLint.LintResult): LineCheckFileResult {
  return {
    filePath: result.filePath,
    errorCount: result.errorCount,
    warningCount: result.warningCount,
    messages: result.messages.map((message) => ({
      ruleId: message.ruleId,
      severity: message.severity === 2 ? 'error' : 'warning',
      message: message.message,
      line: message.line,
      column: message.column,
    })),
  };
}

/** Run ESLint line check on monorepo targets (programmatic API for dev tools). */
export async function lineCheck(options: LineCheckOptions = {}): Promise<LineCheckResult> {
  const targets = resolveTargets({ ...options, mode: 'linecheck' });
  const eslint = new ESLint({
    overrideConfigFile: getEslintConfigPath(),
    fix: options.fix ?? false,
    cwd: options.cwd,
  });

  const rawResults = await eslint.lintFiles(targets);
  if (options.fix) {
    await ESLint.outputFixes(rawResults);
  }
  const results = rawResults;
  const files = results.map(mapResult);

  const errorCount = files.reduce((sum, file) => sum + file.errorCount, 0);
  const warningCount = files.reduce((sum, file) => sum + file.warningCount, 0);
  const fixableErrorCount = rawResults.reduce((sum, file) => sum + file.fixableErrorCount, 0);
  const fixableWarningCount = rawResults.reduce((sum, file) => sum + file.fixableWarningCount, 0);

  return {
    ok: errorCount === 0,
    errorCount,
    warningCount,
    fixableErrorCount,
    fixableWarningCount,
    files: files.filter((file) => file.messages.length > 0),
  };
}

/** Create a reusable ESLint instance wired to the shared Vokop config. */
export function createEslint(options: { fix?: boolean; cwd?: string } = {}): ESLint {
  return new ESLint({
    overrideConfigFile: getEslintConfigPath(),
    fix: options.fix ?? false,
    cwd: options.cwd,
  });
}
