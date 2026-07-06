import { useMemo, useState } from 'react';
import {
  Film,
  Type,
  Layers,
  Mic2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Plus,
  GripVertical,
  Trash2,
  MoreHorizontal,
  Pencil,
  ImageIcon,
  Sticker,
  Sparkles,
  Music2,
  Diamond,
  ArrowRightLeft,
  AudioLines,
  Unplug,
} from 'lucide-react';
import { Dropdown, Input, Modal, type MenuProps } from '@vokop/ui/antd';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/features/settings';
import type { TimelineTrackModel, TimelineTrackType } from '@/features/studio/lib/timelineTypes';
import { isCompactTrackHeight, TRACK_TYPE_PREFIX } from '@/features/studio/lib/timelineTypes';

function confirmRemoveTrack(track: TimelineTrackModel, onDelete: () => void) {
  Modal.confirm({
    title: track.isExtra ? 'Delete track?' : 'Remove track?',
    content: track.isExtra
      ? 'Clips on this track will be removed. This cannot be undone from the menu.'
      : 'The track will be hidden from the timeline. You can restore it from Add track.',
    okText: track.isExtra ? 'Delete' : 'Remove',
    okButtonProps: { danger: true },
    cancelText: 'Cancel',
    centered: true,
    onOk: onDelete,
  });
}

interface TimelineTrackHeaderProps {
  track: TimelineTrackModel;
  /** 0-based track index (Omniclip-style placement). */
  index: number;
  height: number;
  muted: boolean;
  previewHidden?: boolean;
  dragging?: boolean;
  dropTarget?: boolean;
  onToggleMute: () => void;
  onTogglePreview?: () => void;
  onAddClip: () => void;
  onDelete?: () => void;
  onRename: (label: string) => void;
  onAddKeyframe?: () => void;
  moveTargets?: { id: string; label: string }[];
  onMoveClipToTrack?: (trackId: string) => void;
  hasSelectedClip?: boolean;
  /** Video track: extract audio to audio track (video keeps sound). */
  onExtractAudio?: () => void;
  /** Video track: extract audio and mute video (split audio from video). */
  onDetachAudio?: () => void;
  onDragStart: (trackId: string) => void;
  onDragOver: (trackId: string) => void;
  onDragEnd: () => void;
  onDrop: (trackId: string) => void;
  resizeHandleProps?: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  };
  resizing?: boolean;
}

const TRACK_ICONS: Record<TimelineTrackType, typeof Film> = {
  video: Film,
  text: Type,
  image: ImageIcon,
  sticker: Sticker,
  effect: Sparkles,
  sound: Music2,
  audio: Mic2,
  overlay: Layers,
};

const ADDABLE_TYPES: TimelineTrackType[] = [
  'text',
  'image',
  'sticker',
  'effect',
];

const MUTABLE_TYPES: TimelineTrackType[] = [
  'video',
  'audio',
  'sound',
  'image',
  'sticker',
  'effect',
  'overlay',
];

export function TimelineTrackHeader({
  track,
  index,
  height,
  muted,
  previewHidden = false,
  dragging,
  dropTarget,
  onToggleMute,
  onTogglePreview,
  onAddClip,
  onDelete,
  onRename,
  onAddKeyframe,
  moveTargets,
  onMoveClipToTrack,
  hasSelectedClip,
  onExtractAudio,
  onDetachAudio,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  resizeHandleProps,
  resizing = false,
}: TimelineTrackHeaderProps) {
  const { t } = useTranslation();
  const compact = isCompactTrackHeight(height);
  const iconSize = compact ? 10 : 12;
  const actionIconSize = compact ? 11 : 12;
  const Icon = TRACK_ICONS[track.type];
  const canAdd = ADDABLE_TYPES.includes(track.type);
  const canMute = MUTABLE_TYPES.includes(track.type);
  const canDelete = Boolean(onDelete);
  const trackCode = `${TRACK_TYPE_PREFIX[track.type]}${index + 1}`;
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(track.label);

  const localizedLabel = useMemo(() => {
    const typeLower = track.type.toLowerCase();
    const defaultLabels = ['video', 'audio', 'sound', 'text', 'image', 'sticker', 'effect'];
    if (defaultLabels.includes(typeLower) && (track.label.toLowerCase() === typeLower)) {
      if (typeLower === 'video') return t('studioToolMedia');
      if (typeLower === 'audio') return t('studioToolVoice');
      if (typeLower === 'sound') return t('studioToolAudio');
      if (typeLower === 'text') return t('studioToolText');
      if (typeLower === 'image') return t('studioToolMedia');
      if (typeLower === 'sticker') return t('studioToolEffects');
      if (typeLower === 'effect') return t('studioToolEffects');
    }
    return track.label;
  }, [track.type, track.label, t]);

  const openRename = () => {
    setNameDraft(track.label);
    setRenameOpen(true);
  };

  const commitRename = () => {
    onRename(nameDraft);
    setRenameOpen(false);
  };

  const menuItems = useMemo<MenuProps['items']>(() => {
    const items: MenuProps['items'] = [];

    if (canMute) {
      items.push({
        key: 'mute',
        icon: muted ? <VolumeX size={14} /> : <Volume2 size={14} />,
        label: muted ? 'Unmute track' : 'Mute track',
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          onToggleMute();
        },
      });
    }

    if (canAdd) {
      items.push({
        key: 'add',
        icon: <Plus size={14} />,
        label: 'Add clip',
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          onAddClip();
        },
      });
    }

    items.push({
      key: 'rename',
      icon: <Pencil size={14} />,
      label: 'Rename…',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        openRename();
      },
    });

    if (hasSelectedClip && onAddKeyframe) {
      items.push({
        key: 'keyframe',
        icon: <Diamond size={14} />,
        label: 'Add keyframe (EA)',
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          onAddKeyframe();
        },
      });
    }

    if (hasSelectedClip && moveTargets && moveTargets.length > 0 && onMoveClipToTrack) {
      items.push({
        key: 'move',
        icon: <ArrowRightLeft size={14} />,
        label: 'Move clip to',
        children: moveTargets.map((t) => ({
          key: `move-${t.id}`,
          label: t.label,
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            onMoveClipToTrack(t.id);
          },
        })),
      });
    }

    if (track.type === 'video' && (onExtractAudio || onDetachAudio)) {
      items.push({ type: 'divider' });
      if (onExtractAudio) {
        items.push({
          key: 'extract-audio',
          icon: <AudioLines size={14} />,
          label: 'Extract audio',
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            onExtractAudio();
          },
        });
      }
      if (onDetachAudio) {
        items.push({
          key: 'detach-audio',
          icon: <Unplug size={14} />,
          label: 'Detach audio from video',
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            onDetachAudio();
          },
        });
      }
    }

    if (canDelete && onDelete) {
      items.push({ type: 'divider' });
      items.push({
        key: 'delete',
        danger: true,
        icon: <Trash2 size={14} />,
        label: track.isExtra ? 'Delete track' : 'Remove track',
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          confirmRemoveTrack(track, onDelete);
        },
      });
    }

    return items;
  }, [
    canAdd,
    canDelete,
    canMute,
    hasSelectedClip,
    moveTargets,
    muted,
    onAddClip,
    onAddKeyframe,
    onDelete,
    onMoveClipToTrack,
    onExtractAudio,
    onDetachAudio,
    onToggleMute,
    track,
  ]);

  return (
    <div
      className={cn(
        'studio-track-header',
        `studio-track-header--${track.type}`,
        muted && 'is-muted',
        previewHidden && 'is-preview-hidden',
        dragging && 'is-dragging',
        dropTarget && 'is-drop-target',
        compact && 'is-compact',
        resizing && 'is-resizing',
      )}
      style={{ height }}
      data-track={track.type}
      data-track-id={track.id}
      data-track-index={index}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/x-vokop-track', String(track.id));
        onDragStart(String(track.id));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(String(track.id));
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(String(track.id));
      }}
      onDragEnd={onDragEnd}
    >
      <div className="studio-track-header-main">
        <span className="studio-track-header-grip" title="Drag to reorder" aria-hidden>
          <GripVertical size={iconSize} />
        </span>
        <span
          className={cn(
            'studio-track-header-icon',
            `studio-track-header-icon--${track.type}`,
          )}
          aria-hidden
        >
          <Icon size={iconSize} strokeWidth={2} />
        </span>
        <div className="studio-track-header-meta" title={`${trackCode} · ${localizedLabel}`}>
          <span className="studio-track-header-code font-mono">{trackCode}</span>
          <span className="studio-track-header-label">{localizedLabel}</span>
        </div>
      </div>

      <div className="studio-track-header-actions">
        {onTogglePreview && (
          <button
            type="button"
            className={cn('studio-track-header-btn', previewHidden && 'is-active')}
            title={previewHidden ? `Show ${localizedLabel} in preview` : `Hide ${localizedLabel} from preview`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePreview();
            }}
          >
            {previewHidden ? <EyeOff size={actionIconSize} /> : <Eye size={actionIconSize} />}
          </button>
        )}
        {canMute && (
          <button
            type="button"
            className={cn('studio-track-header-btn', muted && 'is-active')}
            title={muted ? `Unmute ${localizedLabel}` : `Mute ${localizedLabel}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
          >
            {muted ? <VolumeX size={actionIconSize} /> : <Volume2 size={actionIconSize} />}
          </button>
        )}

        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{ items: menuItems, className: 'studio-track-menu' }}
        >
          <button
            type="button"
            className="studio-track-header-btn"
            title="Track menu"
            aria-label={`${localizedLabel} menu`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={compact ? 12 : 14} />
          </button>
        </Dropdown>
      </div>

      {resizeHandleProps && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize track height"
          className="studio-track-header-resize"
          onDragStart={(e) => e.preventDefault()}
          {...resizeHandleProps}
        />
      )}

      <Modal
        title="Rename track"
        open={renameOpen}
        onOk={commitRename}
        onCancel={() => setRenameOpen(false)}
        okText="Save"
        destroyOnHidden
        centered
        width={320}
      >
        <Input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onPressEnter={commitRename}
          placeholder="Track name"
        />
      </Modal>
    </div>
  );
}
