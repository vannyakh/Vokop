import { withWorkDir } from '@vokop/pipeline';

/** Run `fn` inside a temp dir, cleaning up on completion or error. */
export async function withTmpDir<T>(
  prefix: string,
  fn: (dir: string) => Promise<T>,
): Promise<T> {
  return withWorkDir(fn, prefix);
}
