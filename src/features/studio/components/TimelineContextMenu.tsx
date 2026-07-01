import { useEffect, useRef } from 'react';
import {
  Scissors,
  Trash2,
  Type,
  Layers,
  Film,
  Crosshair,
  Plus,
  ImageIcon,
  Copy,
  ClipboardPaste,
  Clipboard,
} from 'lucide-react';
import { cn } from '@/lib/cn';
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
  onSelectFootage: () => void;
  onOpenMedia: () => void;
  onEditCanvas: () => void;
  canSplit: boolean;
  canDelete: boolean;
  canEditCanvas: boolean;
  hasClipboard: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: typeof Scissors;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
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
  onSelectFootage,
  onOpenMedia,
  onEditCanvas,
  canSplit,
  canDelete,
  canEditCanvas,
  hasClipboard,
}: TimelineContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [target, onClose]);

  if (!target) return null;

  const { trackId, clipId, time } = target;
  const isClip = Boolean(clipId && trackId);
  const isVideo = trackId === 'video';
  const isText = trackId === 'text';
  const isOverlay = trackId === 'overlay';
  const isAudio = trackId === 'audio';

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const items: MenuItem[] = [];

  items.push({
    id: 'seek',
    label: 'Seek to here',
    icon: Crosshair,
    onClick: () => run(() => onSeek(time)),
  });

  if (isClip && canEditCanvas) {
    items.push({
      id: 'copy',
      label: 'Copy',
      icon: Copy,
      shortcut: '⌘C',
      onClick: () => run(onCopy),
    });
    items.push({
      id: 'cut',
      label: 'Cut',
      icon: Scissors,
      shortcut: '⌘X',
      onClick: () => run(onCut),
    });
    items.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: Clipboard,
      shortcut: '⌘D',
      onClick: () => run(onDuplicate),
    });
  }

  if (hasClipboard) {
    items.push({
      id: 'paste',
      label: 'Paste here',
      icon: ClipboardPaste,
      shortcut: '⌘V',
      onClick: () => run(() => onPaste(time)),
    });
  }

  if (isClip && isVideo) {
    items.push({
      id: 'select-footage',
      label: 'Select footage',
      icon: Film,
      onClick: () => run(onSelectFootage),
    });
    items.push({
      id: 'open-media',
      label: 'Open media panel',
      icon: ImageIcon,
      onClick: () => run(onOpenMedia),
    });
  }

  if (isClip && canEditCanvas) {
    items.push({
      id: 'edit-canvas',
      label: 'Edit on canvas',
      icon: isOverlay ? Layers : Type,
      onClick: () => run(onEditCanvas),
    });
  }

  if (canSplit) {
    items.push({
      id: 'split',
      label: 'Split at playhead',
      icon: Scissors,
      onClick: () => run(onSplit),
    });
  }

  if (!isClip && trackId) {
    const addLabel =
      trackId === 'text'
        ? 'Add caption here'
        : trackId === 'overlay'
          ? 'Add overlay here'
          : trackId === 'audio'
            ? 'Add voice line here'
            : 'Add at playhead';
    items.push({
      id: 'add',
      label: addLabel,
      icon: Plus,
      onClick: () => run(() => onAddClip(trackId)),
      disabled: trackId === 'video',
    });
  }

  if (canDelete) {
    items.push({
      id: 'delete',
      label: 'Delete clip',
      icon: Trash2,
      onClick: () => run(onDelete),
      danger: true,
    });
  }

  if (!isClip && !trackId) {
    items.push(
      {
        id: 'add-text',
        label: 'Add caption',
        icon: Type,
        onClick: () => run(() => onAddClip('text')),
      },
      {
        id: 'add-overlay',
        label: 'Add overlay line',
        icon: Layers,
        onClick: () => run(() => onAddClip('overlay')),
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
    <div
      ref={menuRef}
      className="studio-timeline-context-menu"
      style={{ left: target.x, top: target.y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="studio-timeline-context-menu-label">{trackLabel}</p>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={cn(
              'studio-timeline-context-menu-item',
              item.danger && 'studio-timeline-context-menu-item--danger',
            )}
            onClick={item.onClick}
          >
            <Icon size={14} strokeWidth={2} />
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="studio-timeline-context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
