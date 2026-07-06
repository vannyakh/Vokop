import { formatProject } from '../format.js';
import { getCallerPackageDir, toRepoRelativePath } from '../workspace.js';

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const check = args.includes('--check') || !write;
  const pkgDir = getCallerPackageDir(args);
  const rel = toRepoRelativePath(pkgDir);

  const result = await formatProject({ write: write && !check, paths: [rel] });

  if (write) {
    console.log(`[${rel}] formatted ${result.changed} of ${result.checked} file(s).`);
    return;
  }

  if (!result.ok) {
    for (const file of result.files) {
      console.log(file.filePath);
    }
    console.log(`[${rel}] format check: ${result.changed} file(s) need formatting.`);
    process.exitCode = 1;
    return;
  }

  console.log(`[${rel}] format check: ${result.checked} file(s) OK.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
