import { lineCheck } from '../linecheck.js';

function parseArgs(argv: string[]) {
  const fix = argv.includes('--fix');
  const paths = argv.filter((arg) => !arg.startsWith('--'));
  return { fix, paths: paths.length ? paths : undefined };
}

function printResults(result: Awaited<ReturnType<typeof lineCheck>>) {
  for (const file of result.files) {
    for (const message of file.messages) {
      const label = message.severity === 'error' ? 'error' : 'warn';
      const rule = message.ruleId ? ` ${message.ruleId}` : '';
      console.log(`${file.filePath}:${message.line}:${message.column} ${label}${rule} ${message.message}`);
    }
  }

  console.log(
    `\nLine check: ${result.errorCount} error(s), ${result.warningCount} warning(s) in ${result.files.length} file(s)`,
  );
}

async function main() {
  const { fix, paths } = parseArgs(process.argv.slice(2));
  const result = await lineCheck({ fix, paths });

  printResults(result);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
