import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface TmpDir {
  dir: string;
  cleanup: () => Promise<void>;
}

/** Create a unique temp directory and return a cleanup handle. */
export async function makeTmpDir(prefix = 'vokop-'): Promise<TmpDir> {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  return {
    dir,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

/** Run fn inside a temp dir, cleaning up on completion or error. */
export async function withTmpDir<T>(
  prefix: string,
  fn: (dir: string) => Promise<T>,
): Promise<T> {
  const { dir, cleanup } = await makeTmpDir(prefix);
  try {
    return await fn(dir);
  } finally {
    await cleanup();
  }
}
