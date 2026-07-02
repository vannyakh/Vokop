import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Play,
  Pause,
  Sparkles,
  Loader2,
  Mic2,
  Scissors,
  Trash2,
  Mic,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlignCenter,
  Magnet,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import { isEditableTimelineTrack } from '@/features/studio/lib/timelineTrackUtils';
import { Button } from '@/components/ui/Button';
import { StudioTimeline } from '@/features/studio/components/StudioTimeline';
import { TimelineContextMenu } from '@/features/studio/components/TimelineContextMenu';

interface TimelineBarProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onProcessAll: () => void;
  onToggleSyncPlayback: () => void;
}

export function TimelineBar({ videoRef, onProcessAll, onToggleSyncPlayback }: TimelineBarProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const currentTime = useAppStore((s) => s.currentTime);
  const duration = useAppStore((s) => s.duration);
  const status = useAppStore((s) => s.status);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const isSyncPlaying = useAppStore((s) => s.isSyncPlaying);
  const timelineZoom = useAppStore((s) => s.timelineZoom);
  const setTimelineZoom = useAppStore((s) => s.setTimelineZoom);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const removeTimelineClip = useAppStore((s) => s.removeTimelineClip);
  const splitTimelineAtPlayhead = useAppStore((s) => s.splitTimelineAtPlayhead);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const addTimelineClip = useAppStore((s) => s.addTimelineClip);
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);
  const copyTimelineSelection = useAppStore((s) => s.copyTimelineSelection);
  const cutTimelineSelection = useAppStore((s) => s.cutTimelineSelection);
  const pasteTimelineClipboard = useAppStore((s) => s.pasteTimelineClipboard);
  const duplicateTimelineSelection = useAppStore((s) => s.duplicateTimelineSelection);
  const timelineClipboard = useAppStore((s) => s.timelineClipboard);
  const togglePreviewFullscreen = useAppStore((s) => s.togglePreviewFullscreen);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);
  const canvasPreviewAxis = useAppStore((s) => s.canvasPreviewAxis);
  const canvasAttachSnap = useAppStore((s) => s.canvasAttachSnap);
  const toggleCanvasPreviewAxis = useAppStore((s) => s.toggleCanvasPreviewAxis);
  const toggleCanvasAttachSnap = useAppStore((s) => s.toggleCanvasAttachSnap);
  const [isPaused, setIsPaused] = useState(true);
  const [barMenu, setBarMenu] = useState<{ x: number; y: number } | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    setIsPaused(video.paused);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [videoRef, videoUrl]);

  const togglePlay = () => {
    if (videoRef.current?.paused) void videoRef.current.play();
    else videoRef.current?.pause();
  };

  const handleDeleteSelected = () => {
    if (!selectedTimelineClip) return;
    const { trackId, clipId } = selectedTimelineClip;
    if (isEditableTimelineTrack(trackId)) {
      removeTimelineClip(trackId, clipId);
      selectCanvasElement(null);
    }
  };

  const canDelete = isEditableTimelineTrack(selectedTimelineClip?.trackId);

  const canSplit =
    selectedTimelineClip?.trackId === 'text' ||
    (selectedTimelineClip?.trackId === 'overlay' &&
      selectedTimelineClip.clipId &&
      !selectedTimelineClip.clipId.startsWith('logo-') &&
      !selectedTimelineClip.clipId.startsWith('image-'));

  if (!videoUrl) return null;

  return (
    <div
      ref={dockRef}
      className="studio-editor-dock"
      onContextMenu={(e) => {
        if (!dockRef.current?.contains(e.target as Node)) return;
        if ((e.target as HTMLElement).closest('.studio-timeline-context-menu')) return;
        if ((e.target as HTMLElement).closest('.studio-timeline-scroll')) return;
        e.preventDefault();
        setBarMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div className="studio-playback-bar">
        <div className="studio-playback-cluster">
          <button
            type="button"
            className="studio-playback-icon-btn"
            title="Split at playhead"
            onClick={splitTimelineAtPlayhead}
          >
            <Scissors size={15} />
          </button>
          <button
            type="button"
            className="studio-playback-icon-btn"
            title="Delete selected clip"
            disabled={!canDelete}
            onClick={handleDeleteSelected}
          >
            <Trash2 size={15} />
          </button>
          <Button size="md" onClick={onProcessAll} disabled={status !== 'idle'} className="studio-playback-process">
            {status === 'idle' ? <Sparkles size={14} /> : <Loader2 size={14} className="animate-spin" />}
            Process All
          </Button>
        </div>

        <div className="studio-playback-center">
          <button
            type="button"
            onClick={togglePlay}
            className="studio-playback-play"
            title={isPaused ? 'Play' : 'Pause'}
          >
            {isPaused ? (
              <Play size={13} fill="currentColor" className="ml-0.5" />
            ) : (
              <Pause size={13} />
            )}
          </button>
          <span className="studio-playback-time font-mono">
            <span className="studio-playback-time-current">{formatStudioTimecode(currentTime)}</span>
            <span className="studio-playback-time-sep">|</span>
            <span className="studio-playback-time-total">{formatStudioTimecode(duration)}</span>
          </span>
        </div>

        <div className="studio-playback-cluster">
          <button type="button" className="studio-playback-icon-btn" title="Record voiceover">
            <Mic size={15} />
          </button>
          <button
            type="button"
            onClick={onToggleSyncPlayback}
            disabled={!audioBase64}
            className={cn('studio-playback-icon-btn studio-playback-ai', isSyncPlaying && 'active')}
            title="Live preview"
          >
            {isSyncPlaying ? <Pause size={14} /> : <Mic2 size={14} />}
          </button>
          <div className="studio-playback-divider" />
          <button
            type="button"
            className={cn('studio-playback-icon-btn', canvasPreviewAxis && 'studio-playback-icon-btn--active')}
            onClick={toggleCanvasPreviewAxis}
            title={`${canvasPreviewAxis ? 'Turn off' : 'Turn on'} preview axis (S)`}
            aria-pressed={canvasPreviewAxis}
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            className={cn('studio-playback-icon-btn', canvasAttachSnap && 'studio-playback-icon-btn--active')}
            onClick={toggleCanvasAttachSnap}
            title={`${canvasAttachSnap ? 'Turn off' : 'Turn on'} Attach (N)`}
            aria-pressed={canvasAttachSnap}
          >
            <Magnet size={15} />
          </button>
          <div className="studio-playback-divider" />
          <button
            type="button"
            className="studio-playback-icon-btn"
            onClick={() => setTimelineZoom(timelineZoom - 25)}
            title="Zoom out"
          >
            <ZoomOut size={15} />
          </button>
          <input
            type="range"
            min={25}
            max={400}
            step={25}
            value={timelineZoom}
            onChange={(e) => setTimelineZoom(Number(e.target.value))}
            className="studio-playback-zoom-slider"
            aria-label="Timeline zoom"
          />
          <span className="studio-playback-zoom-label font-mono">{timelineZoom}%</span>
          <button
            type="button"
            className="studio-playback-icon-btn"
            onClick={() => setTimelineZoom(timelineZoom + 25)}
            title="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
          <div className="studio-playback-divider" />
          <button
            type="button"
            className="studio-playback-icon-btn"
            onClick={togglePreviewFullscreen}
            title={previewFullscreenOpen ? 'Exit fullscreen preview' : 'Fullscreen preview'}
            aria-pressed={previewFullscreenOpen}
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      <StudioTimeline videoRef={videoRef} isPlaying={!isPaused} />

      <TimelineContextMenu
        target={barMenu ? { x: barMenu.x, y: barMenu.y, time: currentTime } : null}
        onClose={() => setBarMenu(null)}
        onSeek={(time) => {
          if (videoRef.current) videoRef.current.currentTime = time;
        }}
        onSplit={splitTimelineAtPlayhead}
        onDelete={handleDeleteSelected}
        onCopy={copyTimelineSelection}
        onCut={cutTimelineSelection}
        onPaste={(atTime) => pasteTimelineClipboard(atTime)}
        onDuplicate={duplicateTimelineSelection}
        onAddClip={(trackId) => addTimelineClip(trackId, currentTime)}
        onSelectFootage={() => {}}
        onOpenMedia={() => {
          setActiveStudioTool('media');
          setToolsDrawerOpen(true);
        }}
        onEditCanvas={() => {
          if (selectedTimelineClip) selectCanvasElement(selectedTimelineClip.clipId);
        }}
        canSplit={canSplit}
        canDelete={canDelete}
        canEditCanvas={isEditableTimelineTrack(selectedTimelineClip?.trackId)}
        hasClipboard={Boolean(timelineClipboard?.length)}
      />
    </div>
  );
}
