/** Platform detection helpers (adapted from OpenCut `utils/platform.ts`). */

export function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return true;
  return (
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ||
    navigator.userAgent.includes('Mac')
  );
}

/** Primary shortcut modifier label: ⌘ on Apple devices, Ctrl elsewhere. */
export function getPlatformSpecialKey(): string {
  return isAppleDevice() ? '⌘' : 'Ctrl';
}

/** Alternate modifier label: ⌥ on Apple devices, Alt elsewhere. */
export function getPlatformAlternateKey(): string {
  return isAppleDevice() ? '⌥' : 'Alt';
}
