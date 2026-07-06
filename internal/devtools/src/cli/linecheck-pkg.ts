import { lineCheck } from '../linecheck.js';
import { getCallerPackageDir, toRepoRelativePath } from '../workspace.js';

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const pkgDir = getCallerPackageDir(args);
  const rel = toRepoRelativePath(pkgDir);

  const result = await lineCheck({ paths: [rel], fix });

  for (const file of result.files) {
    for (const message of file.messages) {
      const label = message.severity === 'error' ? 'error' : 'warn';
      const rule = message.ruleId ? ` ${message.ruleId}` : '';
      console.log(`${file.filePath}:${message.line}:${message.column} ${label}${rule} ${message.message}`);
    }
  }

  console.log(
    `[${rel}] line check: ${result.errorCount} error(s), ${result.warningCount} warning(s)`,
  );

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
