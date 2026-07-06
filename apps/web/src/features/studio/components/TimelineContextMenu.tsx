import {
  Scissors,
  Trash2,
  Type,
  Layers,
  Crosshair,
  Plus,
  Copy,
  ClipboardPaste,
  CopyPlus,
  Diamond,
  ImageIcon,
} from 'lucide-react';
import {
  EditorContextMenu,
  type EditorMenuItem,
} from '@/features/studio/components/EditorContextMenu';
import {
  buildFootageContextMenuItems,
  type FootageContextMenuActions,
} from '@/features/studio/lib/timelineFootageContextMenuItems';
import type { TimelineTrackId } from '@/features/studio/lib/timelineTypes';

export interface TimelineContextMenuTarget {
  x: number;
  y: number;
  trackId?: TimelineTrackId;
  clipId?: string;
  time: number;
}

interface TimelineContextMenuProps {
  target: TimelineContextMenuTarget | null;
  onClose: () => void;
  onSeek: (time: number) => void;
  onSplit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: (atTime: number) => void;
  onDuplicate: () => void;
  onAddClip: (trackId: TimelineTrackId) => void;
  onEditCanvas: () => void;
  onAddKeyframe?: () => void;
  footageActions?: FootageContextMenuActions;
  canSplit: boolean;
  canDelete: boolean;
  canEditCanvas: boolean;
  canAddKeyframe?: boolean;
  hasClipboard: boolean;
}

export function TimelineContextMenu({
  target,
  onClose,
  onSeek,
  onSplit,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onAddClip,
  onEditCanvas,
  onAddKeyframe,
  footageActions,
  canSplit,
  canDelete,
  canEditCanvas,
  canAddKeyframe,
  hasClipboard,
}: TimelineContextMenuProps) {
  const { trackId, clipId, time } = target ?? {};
  const isClip = Boolean(clipId && trackId);
  const isVideo = trackId === 'video' || String(trackId ?? '').startsWith('video-');
  const isText = trackId === 'text' || String(trackId ?? '').startsWith('text-');
  const isOverlay =
    trackId === 'overlay' ||
    trackId === 'image' ||
    trackId === 'sticker' ||
    trackId === 'effect' ||
    String(trackId ?? '').startsWith('overlay-') ||
    String(trackId ?? '').startsWith('image-') ||
    String(trackId ?? '').startsWith('sticker-') ||
    String(trackId ?? '').startsWith('effect-');
  const isAudio =
    trackId === 'audio' ||
    trackId === 'sound' ||
    String(trackId ?? '').startsWith('audio-') ||
    String(trackId ?? '').startsWith('sound-');

  if (isClip && isVideo && footageActions) {
    const items = buildFootageContextMenuItems({
      ...footageActions,
      hasClipSelection: true,
    });
    return (
      <EditorContextMenu
        target={target}
        title=""
        items={items}
        onClose={onClose}
        className="studio-timeline-context-menu studio-footage-context-menu"
      />
    );
  }

  const items: EditorMenuItem[] = [];

  items.push({
    id: 'seek',
    label: 'Seek to here',
    icon: Crosshair,
    onClick: () => onSeek(time ?? 0),
  });

  if (isClip && canEditCanvas) {
    items.push(
      {
        id: 'copy',
        label: 'Copy',
        icon: Copy,
        shortcutKey: 'shortcutCopy',
        onClick: onCopy,
        separatorBefore: true,
      },
      {
        id: 'cut',
        label: 'Cut',
        icon: Scissors,
        shortcutKey: 'shortcutCut',
        onClick: onCut,
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: CopyPlus,
        shortcutKey: 'shortcutDuplicate',
        onClick: onDuplicate,
      },
    );
  }

  if (hasClipboard) {
    items.push({
      id: 'paste',
      label: 'Paste here',
      icon: ClipboardPaste,
      shortcutKey: 'shortcutPaste',
      onClick: () => onPaste(time ?? 0),
      separatorBefore: !isClip || !canEditCanvas,
    });
  }

  if (isClip && canEditCanvas) {
    items.push({
      id: 'edit-canvas',
      label: 'Edit on canvas',
      icon: isOverlay ? Layers : Type,
      onClick: onEditCanvas,
      separatorBefore: true,
    });
  }

  if (isClip && canAddKeyframe && onAddKeyframe) {
    items.push({
      id: 'keyframe',
      label: 'Add keyframe (EA)',
      icon: Diamond,
      onClick: onAddKeyframe,
    });
  }

  if (canSplit) {
    items.push({
      id: 'split',
      label: 'Split at playhead',
      icon: Scissors,
      shortcutKey: 'shortcutSplit',
      onClick: onSplit,
      separatorBefore: true,
    });
  }

  if (!isClip && trackId) {
    const addLabel =
      isText
        ? 'Add text here'
        : trackId === 'image' || String(trackId).startsWith('image-')
          ? 'Add image here'
          : trackId === 'sticker' || String(trackId).startsWith('sticker-')
            ? 'Add sticker here'
            : trackId === 'effect' || String(trackId).startsWith('effect-')
              ? 'Add effect here'
              : trackId === 'sound' || String(trackId).startsWith('sound-')
                ? 'Add sound here'
                : isAudio
                  ? 'Add audio here'
                  : 'Add at playhead';
    items.push({
      id: 'add',
      label: addLabel,
      icon: Plus,
      onClick: () => onAddClip(trackId),
      disabled: trackId === 'video',
      separatorBefore: true,
    });
  }

  if (canDelete) {
    items.push({
      id: 'delete',
      label: 'Delete clip',
      icon: Trash2,
      onClick: onDelete,
      destructive: true,
      separatorBefore: true,
    });
  }

  if (!isClip && !trackId) {
    items.push(
      {
        id: 'add-text',
        label: 'Add caption',
        icon: Type,
        onClick: () => onAddClip('text'),
        separatorBefore: true,
      },
      {
        id: 'add-image',
        label: 'Add image',
        icon: ImageIcon,
        onClick: () => onAddClip('image'),
      },
      {
        id: 'add-sticker',
        label: 'Add sticker',
        icon: Layers,
        onClick: () => onAddClip('sticker'),
      },
    );
  }

  const trackLabel = isVideo
    ? 'Video footage'
    : isText
      ? 'Text track'
      : isOverlay
        ? 'Overlay track'
        : isAudio
          ? 'Voiceover'
          : 'Timeline';

  return (
    <EditorContextMenu
      target={target}
      title={trackLabel}
      items={items}
      onClose={onClose}
      className="studio-timeline-context-menu"
    />
  );
}
