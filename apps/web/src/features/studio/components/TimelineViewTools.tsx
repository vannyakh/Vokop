import { Mic2, Mic, AlignCenter, Magnet } from 'lucide-react';
import { StudioIcon } from '@vokop/ui';
import { TimelineToolButton } from '@/features/studio/components/TimelineToolButton';

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
}

/** Right toolbar cluster: voice, snap, zoom, fullscreen. */
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
}: TimelineViewToolsProps) {
  return (
    <div className="studio-playback-cluster studio-playback-cluster--view" aria-label="View tools">
      <div className="studio-playback-tool-group">
        <TimelineToolButton title="Record voiceover">
          <Mic size={15} />
        </TimelineToolButton>
        <TimelineToolButton
          tone="ai"
          active={isSyncPlaying}
          disabled={!hasVoiceover}
          onClick={onToggleSyncPlayback}
          title="Live voiceover preview"
        >
          {isSyncPlaying ? <StudioIcon name="pause" size={14} /> : <Mic2 size={14} />}
        </TimelineToolButton>
      </div>

      <span className="studio-playback-divider" aria-hidden />

      <div className="studio-playback-tool-group">
        <TimelineToolButton
          active={canvasPreviewAxis}
          onClick={onTogglePreviewAxis}
          title={`${canvasPreviewAxis ? 'Turn off' : 'Turn on'} preview axis (S)`}
        >
          <AlignCenter size={15} />
        </TimelineToolButton>
        <TimelineToolButton
          active={canvasAttachSnap}
          onClick={onToggleAttachSnap}
          title={`${canvasAttachSnap ? 'Turn off' : 'Turn on'} attach snap (N)`}
        >
          <Magnet size={15} />
        </TimelineToolButton>
      </div>

      <span className="studio-playback-divider" aria-hidden />

      <div className="studio-playback-tool-group studio-playback-zoom">
        <TimelineToolButton
          onClick={() => onZoomChange(timelineZoom - 25)}
          title="Zoom out"
        >
          <StudioIcon name="zoomOut" size={15} />
        </TimelineToolButton>
        <input
          type="range"
          min={25}
          max={400}
          step={25}
          value={timelineZoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="studio-playback-zoom-slider"
          aria-label="Timeline zoom"
        />
        <span className="studio-playback-zoom-label font-mono">{timelineZoom}%</span>
        <TimelineToolButton
          onClick={() => onZoomChange(timelineZoom + 25)}
          title="Zoom in"
        >
          <StudioIcon name="zoomIn" size={15} />
        </TimelineToolButton>
      </div>

      <span className="studio-playback-divider" aria-hidden />

      <TimelineToolButton
        active={previewFullscreenOpen}
        onClick={onToggleFullscreen}
        title={previewFullscreenOpen ? 'Exit fullscreen preview' : 'Fullscreen preview'}
      >
        <StudioIcon name="fullscreen" size={15} />
      </TimelineToolButton>
    </div>
  );
}
