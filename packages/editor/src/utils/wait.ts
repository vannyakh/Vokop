/** Resolve after `seconds` — adapted from Omniclip `s/utils/wait.ts`. */
export function wait(seconds: number): Promise<true> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), seconds * 1000);
  });
}
