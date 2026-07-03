import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

/** Create a unique scratch directory for one job. */
export async function createWorkDir(prefix = "vokop-render-"): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

/** Delete a scratch directory, ignoring errors (best-effort cleanup). */
export async function removeWorkDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // best effort — a leftover tmp dir is not worth failing the job
  }
}

/** Run fn with a scratch dir that is always cleaned up afterwards. */
export async function withWorkDir<T>(
  fn: (dir: string) => Promise<T>,
  prefix?: string,
): Promise<T> {
  const dir = await createWorkDir(prefix);
  try {
    return await fn(dir);
  } finally {
    await removeWorkDir(dir);
  }
}
