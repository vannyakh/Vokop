import {
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  ImageIcon,
  Pause,
  Replace,
  Scissors,
  Sparkles,
  SplitSquareVertical,
  Trash2,
  Volume2,
  ArrowUpToLine,
} from 'lucide-react';
import type { EditorMenuItem } from '@/features/studio/components/EditorContextMenu';

export interface FootageContextMenuActions {
  split: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  delete: () => void;
  replace: () => void;
  downloadClip: () => void;
  downloadFrame: () => void;
  openTranscriptEditor: () => void;
  separateAudio: () => void;
  splitScene: () => void;
  freeze: () => void;
  promoteToMaster?: () => void;
  canSplit: boolean;
  canDelete: boolean;
  hasClipboard: boolean;
  hasClipSelection: boolean;
  canPromoteToMaster?: boolean;
}

/** CapCut-style right-click menu for video footage clips on the timeline. */
export function buildFootageContextMenuItems(
  actions: FootageContextMenuActions,
): EditorMenuItem[] {
  const items: EditorMenuItem[] = [];

  if (actions.canSplit) {
    items.push({
      id: 'split',
      label: 'Split',
      icon: SplitSquareVertical,
      shortcutKey: 'shortcutSplit',
      onClick: actions.split,
    });
  }

  if (actions.hasClipSelection) {
    items.push(
      {
        id: 'copy',
        label: 'Copy',
        icon: Copy,
        shortcutKey: 'shortcutCopy',
        onClick: actions.copy,
        separatorBefore: !actions.canSplit,
      },
      {
        id: 'cut',
        label: 'Cut',
        icon: Scissors,
        shortcutKey: 'shortcutCut',
        onClick: actions.cut,
      },
      {
        id: 'paste',
        label: 'Paste',
        icon: ClipboardPaste,
        shortcutKey: 'shortcutPaste',
        onClick: actions.paste,
        disabled: !actions.hasClipboard,
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: CopyPlus,
        shortcutKey: 'shortcutDuplicate',
        onClick: actions.duplicate,
      },
    );
  } else {
    items.push({
      id: 'paste',
      label: 'Paste',
      icon: ClipboardPaste,
      shortcutKey: 'shortcutPaste',
      onClick: actions.paste,
      disabled: !actions.hasClipboard,
      separatorBefore: !actions.canSplit,
    });
  }

  if (actions.canDelete) {
    items.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      shortcutKey: 'shortcutDelete',
      onClick: actions.delete,
      destructive: true,
    });
  }

  items.push({
    id: 'replace',
    label: 'Replace',
    icon: Replace,
    onClick: actions.replace,
    separatorBefore: true,
  });

  if (actions.canPromoteToMaster && actions.promoteToMaster) {
    items.push({
      id: 'promote-master',
      label: 'Promote to master',
      icon: ArrowUpToLine,
      onClick: actions.promoteToMaster,
    });
  }

  items.push({
    id: 'download',
    label: 'Download clip',
    icon: Download,
    onClick: () => {},
    separatorBefore: true,
    submenu: [
      {
        id: 'download-source',
        label: 'Original file',
        icon: Download,
        onClick: actions.downloadClip,
      },
      {
        id: 'download-frame',
        label: 'Current frame (PNG)',
        icon: ImageIcon,
        onClick: actions.downloadFrame,
      },
    ],
  });

  items.push(
    {
      id: 'transcript-edit',
      label: 'Transcript-based editing',
      icon: Sparkles,
      onClick: actions.openTranscriptEditor,
    },
    {
      id: 'separate-audio',
      label: 'Separate audio',
      icon: Volume2,
      shortcutKey: 'shortcutSeparateAudio',
      onClick: actions.separateAudio,
    },
    {
      id: 'split-scene',
      label: 'Split scene',
      icon: Scissors,
      onClick: actions.splitScene,
      disabled: !actions.canSplit,
    },
    {
      id: 'freeze',
      label: 'Freeze',
      icon: Pause,
      onClick: actions.freeze,
    },
  );

  return items;
}
