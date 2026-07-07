/** Geometry helpers (adapted from OpenCut `utils/geometry.ts`). */

/** Reduce pixel dimensions to an aspect-ratio string, e.g. 1920×1080 → "16:9". */
export function dimensionToAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}
