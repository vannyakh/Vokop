import type { ShortcutToken } from '@/features/studio/lib/shortcutKeys';
import { formatMenuShortcut } from '@/features/studio/lib/shortcutKeys';

/** Keyboard shortcut groups shown in Help → Shortcuts (Omniclip-style). */
export type StudioShortcutGroupId = 'global' | 'timeline' | 'canvas';

export interface StudioShortcutItem {
  labelKey: string;
  keys: ShortcutToken[];
}

export interface StudioShortcutGroup {
  id: StudioShortcutGroupId;
  titleKey: string;
  items: StudioShortcutItem[];
}

export const STUDIO_KEYBOARD_SHORTCUTS: StudioShortcutGroup[] = [
  {
    id: 'global',
    titleKey: 'shortcutsGroupGlobal',
    items: [
      { labelKey: 'shortcutSelectAll', keys: ['mod', 'A'] },
      { labelKey: 'shortcutSelectMultiple', keys: ['mod', 'Click'] },
      { labelKey: 'shortcutCopy', keys: ['mod', 'C'] },
      { labelKey: 'shortcutCut', keys: ['mod', 'X'] },
      { labelKey: 'shortcutPaste', keys: ['mod', 'V'] },
      { labelKey: 'shortcutDuplicate', keys: ['mod', 'D'] },
      { labelKey: 'shortcutDelete', keys: ['⌫'] },
      { labelKey: 'shortcutUndo', keys: ['mod', 'Z'] },
      { labelKey: 'shortcutRedo', keys: ['shift', 'mod', 'Z'] },
      { labelKey: 'shortcutPlayPause', keys: ['Space'] },
      { labelKey: 'shortcutDeselect', keys: ['Esc'] },
      { labelKey: 'shortcutSettings', keys: ['mod', ','] },
    ],
  },
  {
    id: 'timeline',
    titleKey: 'shortcutsGroupTimeline',
    items: [
      { labelKey: 'shortcutSplit', keys: ['mod', 'B'] },
      { labelKey: 'shortcutSplitRemoveLeft', keys: ['Q'] },
      { labelKey: 'shortcutSplitRemoveRight', keys: ['W'] },
      { labelKey: 'shortcutToggleBookmark', keys: ['M'] },
      { labelKey: 'shortcutSeparateAudio', keys: ['shift', 'mod', 'S'] },
      { labelKey: 'shortcutZoomIn', keys: ['mod', '+'] },
      { labelKey: 'shortcutZoomOut', keys: ['mod', '-'] },
      { labelKey: 'shortcutPrevFrame', keys: ['mod', '←'] },
      { labelKey: 'shortcutNextFrame', keys: ['mod', '→'] },
      { labelKey: 'shortcutPreviewAxis', keys: ['S'] },
      { labelKey: 'shortcutAttachSnap', keys: ['N'] },
    ],
  },
  {
    id: 'canvas',
    titleKey: 'shortcutsGroupCanvas',
    items: [
      { labelKey: 'shortcutFullscreen', keys: ['shift', 'mod', 'F'] },
      { labelKey: 'shortcutSelectTool', keys: ['V'] },
      { labelKey: 'shortcutPanTool', keys: ['H'] },
    ],
  },
];

/** Lookup shortcut tokens for menu Kbd badges. */
export function shortcutTokens(labelKey: string): ShortcutToken[] | undefined {
  for (const group of STUDIO_KEYBOARD_SHORTCUTS) {
    const item = group.items.find((i) => i.labelKey === labelKey);
    if (item) return item.keys;
  }
  return undefined;
}

/** Lookup a formatted menu shortcut, e.g. `shortcutCopy` → `⌘C`. */
export function shortcutMenuLabel(labelKey: string): string | undefined {
  for (const group of STUDIO_KEYBOARD_SHORTCUTS) {
    const item = group.items.find((i) => i.labelKey === labelKey);
    if (item) return formatMenuShortcut(item.keys);
  }
  return undefined;
}
