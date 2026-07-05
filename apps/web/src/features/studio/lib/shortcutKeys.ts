/** Platform-aware keyboard shortcut labels (Mac ⌘ vs Windows/Linux Ctrl). */

export type ShortcutToken = 'mod' | 'shift' | 'alt' | 'ctrl' | string;

const TOKEN_LABELS: Record<string, { mac: string; win: string }> = {
  mod: { mac: '⌘', win: 'Ctrl' },
  shift: { mac: '⇧', win: 'Shift' },
  alt: { mac: '⌥', win: 'Alt' },
  ctrl: { mac: '⌃', win: 'Ctrl' },
};

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return true;
  return (
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ||
    navigator.userAgent.includes('Mac')
  );
}

/** Individual key badges for the shortcuts modal (Omniclip-style). */
export function formatShortcutTokens(tokens: ShortcutToken[]): string[] {
  const mac = isMacPlatform();
  return tokens.map((token) => {
    const mapped = TOKEN_LABELS[token];
    if (mapped) return mac ? mapped.mac : mapped.win;
    return token;
  });
}

/** Compact label for menus, e.g. `⌘Z` or `Ctrl+Z`. */
export function formatMenuShortcut(tokens: ShortcutToken[]): string {
  const keys = formatShortcutTokens(tokens);
  return isMacPlatform() ? keys.join('') : keys.join('+');
}

/** Returns true when `mod` (⌘ or Ctrl) is held. */
export function isModKey(e: KeyboardEvent): boolean {
  return isMacPlatform() ? e.metaKey : e.ctrlKey;
}

const FRAME_STEP_SEC = 1 / 30;

export { FRAME_STEP_SEC };
