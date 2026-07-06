import { formatProject } from '../format.js';

function parseArgs(argv: string[]) {
  const write = argv.includes('--write');
  const check = argv.includes('--check') || !write;
  const paths = argv.filter((arg) => !arg.startsWith('--'));
  return { write: write && !check, paths: paths.length ? paths : undefined };
}

async function main() {
  const { write, paths } = parseArgs(process.argv.slice(2));
  const result = await formatProject({ write, paths });

  if (write) {
    console.log(`Formatted ${result.changed} of ${result.checked} file(s).`);
    return;
  }

  if (!result.ok) {
    for (const file of result.files) {
      console.log(file.filePath);
    }
    console.log(`\nFormat check: ${result.changed} file(s) need formatting.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Format check: ${result.checked} file(s) OK.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
