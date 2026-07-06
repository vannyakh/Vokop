import { useMemo } from 'react';
import {
  Mic2,
  Mic,
  AlignCenter,
  Magnet,
  MoreHorizontal,
} from 'lucide-react';
import { StudioIcon } from '@vokop/ui';
import { Dropdown, type MenuProps } from '@vokop/ui/antd';
import { TimelineToolButton } from '@/features/studio/components/TimelineToolButton';
import { formatMenuShortcut } from '@/features/studio/lib/shortcutKeys';
import {
  TIMELINE_ZOOM_BUTTON_STEP,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
  TIMELINE_ZOOM_STEP,
} from '@/features/studio/lib/timelineTypes';

interface TimelineViewToolsProps {
  hasVoiceover: boolean;
  isSyncPlaying: boolean;
  canvasPreviewAxis: boolean;
  canvasAttachSnap: boolean;
  timelineZoom: number;
  previewFullscreenOpen: boolean;
  onToggleSyncPlayback: () => void;
  onTogglePreviewAxis: () => void;
  onToggleAttachSnap: () => void;
  onZoomChange: (zoom: number) => void;
  onToggleFullscreen: () => void;
  onOpenVoiceTools?: () => void;
  zoomSliderProps?: {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
}

/** Right toolbar cluster: voice, snap, zoom, fullscreen (+ overflow menu). */
export function TimelineViewTools({
  hasVoiceover,
  isSyncPlaying,
  canvasPreviewAxis,
  canvasAttachSnap,
  timelineZoom,
  previewFullscreenOpen,
  onToggleSyncPlayback,
  onTogglePreviewAxis,
  onToggleAttachSnap,
  onZoomChange,
  onToggleFullscreen,
  onOpenVoiceTools,
  zoomSliderProps,
}: TimelineViewToolsProps) {
  const moreItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'voice-record',
        icon: <Mic size={14} />,
        label: 'Voice tools',
        onClick: () => onOpenVoiceTools?.(),
      },
      {
        key: 'voice-preview',
        icon: <Mic2 size={14} />,
        label: isSyncPlaying ? 'Stop voice preview' : 'Live voiceover preview',
        disabled: !hasVoiceover,
        onClick: () => onToggleSyncPlayback(),
      },
      { type: 'divider' },
      {
        key: 'axis',
        icon: <AlignCenter size={14} />,
        label: canvasPreviewAxis ? 'Hide frame guides' : 'Show frame guides',
        onClick: () => onTogglePreviewAxis(),
      },
      {
        key: 'snap',
        icon: <Magnet size={14} />,
        label: canvasAttachSnap ? 'Disable attach snap' : 'Enable attach snap',
        onClick: () => onToggleAttachSnap(),
      },
    ],
    [
      canvasAttachSnap,
      canvasPreviewAxis,
      hasVoiceover,
      isSyncPlaying,
      onOpenVoiceTools,
      onToggleAttachSnap,
      onTogglePreviewAxis,
      onToggleSyncPlayback,
    ],
  );

  return (
    <div className="studio-playback-cluster studio-playback-cluster--view" aria-label="View tools">
      <div className="studio-playback-tool-secondary">
        <div className="studio-playback-tool-group">
          <TimelineToolButton
            title="Open voice / audio tools"
            onClick={onOpenVoiceTools}
          >
            <Mic size={15} />
          </TimelineToolButton>
          <TimelineToolButton
            tone="ai"
            active={isSyncPlaying}
            disabled={!hasVoiceover}
            onClick={onToggleSyncPlayback}
            title={
              hasVoiceover
                ? isSyncPlaying
                  ? 'Stop live voiceover preview'
                  : 'Live voiceover preview'
                : 'Generate a voiceover first'
            }
          >
            {isSyncPlaying ? <StudioIcon name="pause" size={14} /> : <Mic2 size={14} />}
          </TimelineToolButton>
        </div>

        <span className="studio-playback-divider studio-playback-divider--secondary" aria-hidden />

        <div className="studio-playback-tool-group">
          <TimelineToolButton
            active={canvasPreviewAxis}
            onClick={onTogglePreviewAxis}
            title={`${canvasPreviewAxis ? 'Turn off' : 'Turn on'} frame guides (${formatMenuShortcut(['S'])})`}
          >
            <AlignCenter size={15} />
          </TimelineToolButton>
          <TimelineToolButton
            active={canvasAttachSnap}
            onClick={onToggleAttachSnap}
            title={`${canvasAttachSnap ? 'Turn off' : 'Turn on'} attach snap (${formatMenuShortcut(['N'])})`}
          >
            <Magnet size={15} />
          </TimelineToolButton>
        </div>

        <span className="studio-playback-divider studio-playback-divider--secondary" aria-hidden />
      </div>

      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{ items: moreItems, className: 'studio-playback-more-menu' }}
      >
        <div className="studio-playback-more">
          <TimelineToolButton
            className="studio-playback-more-trigger"
            title="More tools"
            aria-label="More timeline tools"
          >
            <MoreHorizontal size={15} />
          </TimelineToolButton>
        </div>
      </Dropdown>

      <div className="studio-playback-tool-group studio-playback-zoom">
        <TimelineToolButton
          onClick={() => onZoomChange(Math.max(TIMELINE_ZOOM_MIN, timelineZoom - TIMELINE_ZOOM_BUTTON_STEP))}
          title={`Zoom out (${formatMenuShortcut(['mod', '-'])})`}
          disabled={timelineZoom <= TIMELINE_ZOOM_MIN}
        >
          <StudioIcon name="zoomOut" size={15} />
        </TimelineToolButton>
        <input
          type="range"
          min={TIMELINE_ZOOM_MIN}
          max={TIMELINE_ZOOM_MAX}
          step={TIMELINE_ZOOM_STEP}
          value={timelineZoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="studio-playback-zoom-slider"
          aria-label="Timeline zoom"
          {...zoomSliderProps}
        />
        <span className="studio-playback-zoom-label font-mono">{timelineZoom}%</span>
        <TimelineToolButton
          onClick={() => onZoomChange(Math.min(TIMELINE_ZOOM_MAX, timelineZoom + TIMELINE_ZOOM_BUTTON_STEP))}
          title={`Zoom in (${formatMenuShortcut(['mod', '+'])})`}
          disabled={timelineZoom >= TIMELINE_ZOOM_MAX}
        >
          <StudioIcon name="zoomIn" size={15} />
        </TimelineToolButton>
      </div>

      <span className="studio-playback-divider" aria-hidden />

      <TimelineToolButton
        active={previewFullscreenOpen}
        onClick={onToggleFullscreen}
        title={
          previewFullscreenOpen
            ? 'Exit fullscreen preview'
            : `Fullscreen preview (${formatMenuShortcut(['shift', 'mod', 'F'])})`
        }
      >
        <StudioIcon name="fullscreen" size={15} />
      </TimelineToolButton>
    </div>
  );
}
