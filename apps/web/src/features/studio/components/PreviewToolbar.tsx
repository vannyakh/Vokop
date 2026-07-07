import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, StepBack, StepForward } from 'lucide-react';
import { StudioIcon } from '@vokop/ui';
import { Dropdown, type MenuProps } from '@vokop/ui/antd';
import { useAppStore } from '@/features/project';
import { cn } from '@/lib/cn';
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

/** Editable `HH:MM:SS:FF` timecode for the playback bar. */
export function EditableFrameTimecode({
  currentTime,
  duration,
  onSeek,
  className = 'studio-preview-timecode font-mono',
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
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
    <div className={className}>
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
      <span className="studio-preview-timecode-total">{formatFrameTimecode(duration)}</span>
    </div>
  );
}

export function PreviewFrameStepButtons({
  onStep,
}: {
  onStep: (direction: -1 | 1) => void;
}) {
  return (
    <>
      <TimelineToolButton title="Previous frame" onClick={() => onStep(-1)}>
        <StepBack size={14} />
      </TimelineToolButton>
      <TimelineToolButton title="Next frame" onClick={() => onStep(1)}>
        <StepForward size={14} />
      </TimelineToolButton>
    </>
  );
}

export function PreviewZoomSelect({
  viewport,
  className,
}: {
  viewport: PreviewViewportZoom;
  className?: string;
}) {
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
        className={cn('studio-preview-zoom-trigger font-mono', className)}
        title={`Preview zoom (${formatMenuShortcut(['mod'])} + scroll to zoom, scroll to pan)`}
      >
        {isAtFit ? 'Fit' : `${zoomPercent}%`}
        <ChevronDown size={12} aria-hidden />
      </button>
    </Dropdown>
  );
}

/** @deprecated Preview toolbar moved into timeline playback bar. */
export function PreviewToolbar({ viewport }: { viewport: PreviewViewportZoom }) {
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
      <EditableFrameTimecode currentTime={currentTime} duration={duration} onSeek={seekTimeline} />
      <div className="studio-preview-toolbar-transport">
        <PreviewFrameStepButtons onStep={stepFrame} />
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
