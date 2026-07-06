import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, StepBack, StepForward } from 'lucide-react';
import { StudioIcon } from '@vokop/ui';
import { Dropdown, type MenuProps } from '@vokop/ui/antd';
import { useAppStore } from '@/features/project';
import { TimelineToolButton } from '@/features/studio/components/TimelineToolButton';
import {
  PREVIEW_ZOOM_PRESETS,
  type PreviewViewportZoom,
} from '@/features/studio/hooks/usePreviewViewportZoom';
import { FRAME_STEP_SEC, formatMenuShortcut } from '@/features/studio/lib/shortcutKeys';
import {
  formatFrameTimecode,
  parseTimecodeInput,
} from '@/features/studio/lib/timelineUtils';

interface PreviewToolbarProps {
  viewport: PreviewViewportZoom;
}

/**
 * OpenCut-style toolbar under the preview: editable timecode, transport
 * controls, viewport zoom select and fullscreen.
 */
export function PreviewToolbar({ viewport }: PreviewToolbarProps) {
  const currentTime = useAppStore((s) => s.currentTime);
  const duration = useAppStore((s) => s.duration);
  const isTimelinePlaying = useAppStore((s) => s.isTimelinePlaying);
  const toggleTimelinePlaying = useAppStore((s) => s.toggleTimelinePlaying);
  const seekTimeline = useAppStore((s) => s.seekTimeline);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);
  const togglePreviewFullscreen = useAppStore((s) => s.togglePreviewFullscreen);

  const stepFrame = (direction: -1 | 1) => {
    seekTimeline(currentTime + direction * FRAME_STEP_SEC);
  };

  return (
    <div className="studio-preview-toolbar" aria-label="Preview controls">
      <EditableTimecode
        currentTime={currentTime}
        duration={duration}
        onSeek={seekTimeline}
      />

      <div className="studio-preview-toolbar-transport">
        <TimelineToolButton title="Previous frame" onClick={() => stepFrame(-1)}>
          <StepBack size={14} />
        </TimelineToolButton>
        <button
          type="button"
          onClick={toggleTimelinePlaying}
          className="studio-playback-play"
          title={isTimelinePlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isTimelinePlaying ? (
            <StudioIcon name="pause" size={14} />
          ) : (
            <StudioIcon name="play" size={14} className="ml-0.5" />
          )}
        </button>
        <TimelineToolButton title="Next frame" onClick={() => stepFrame(1)}>
          <StepForward size={14} />
        </TimelineToolButton>
      </div>

      <div className="studio-preview-toolbar-view">
        <PreviewZoomSelect viewport={viewport} />
        <span className="studio-playback-divider" aria-hidden />
        <TimelineToolButton
          active={previewFullscreenOpen}
          onClick={togglePreviewFullscreen}
          title={
            previewFullscreenOpen
              ? 'Exit fullscreen preview'
              : `Fullscreen preview (${formatMenuShortcut(['shift', 'mod', 'F'])})`
          }
        >
          <StudioIcon name="fullscreen" size={14} />
        </TimelineToolButton>
      </div>
    </div>
  );
}

function EditableTimecode({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const parsed = parseTimecodeInput(text);
    if (parsed != null) onSeek(parsed);
    setEditing(false);
  };

  return (
    <div className="studio-preview-timecode font-mono">
      {editing ? (
        <input
          ref={inputRef}
          className="studio-preview-timecode-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
            e.stopPropagation();
          }}
          spellCheck={false}
          aria-label="Seek to timecode"
        />
      ) : (
        <button
          type="button"
          className="studio-preview-timecode-current"
          title="Click to type a timecode"
          onClick={() => {
            setText(formatFrameTimecode(currentTime));
            setEditing(true);
          }}
        >
          {formatFrameTimecode(currentTime)}
        </button>
      )}
      <span className="studio-preview-timecode-sep">/</span>
      <span className="studio-preview-timecode-total">
        {formatFrameTimecode(duration)}
      </span>
    </div>
  );
}

function PreviewZoomSelect({ viewport }: { viewport: PreviewViewportZoom }) {
  const { isAtFit, zoomPercent, fitToScreen, setViewportPercent } = viewport;

  const items = useMemo<MenuProps['items']>(
    () => [
      { key: 'fit', label: 'Fit', onClick: () => fitToScreen() },
      { type: 'divider' },
      ...PREVIEW_ZOOM_PRESETS.map((preset) => ({
        key: String(preset),
        label: `${preset}%`,
        onClick: () => setViewportPercent(preset),
      })),
    ],
    [fitToScreen, setViewportPercent],
  );

  return (
    <Dropdown
      trigger={['click']}
      placement="topRight"
      menu={{
        items,
        selectable: true,
        selectedKeys: [isAtFit ? 'fit' : String(zoomPercent)],
        className: 'studio-playback-more-menu',
      }}
    >
      <button
        type="button"
        className="studio-preview-zoom-trigger font-mono"
        title="Preview zoom (⌘ + scroll to zoom, scroll to pan)"
      >
        {isAtFit ? 'Fit' : `${zoomPercent}%`}
        <ChevronDown size={12} aria-hidden />
      </button>
    </Dropdown>
  );
}
