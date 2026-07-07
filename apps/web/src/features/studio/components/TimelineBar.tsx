import { useRef, useState, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { useTimelinePlaybackMonitor } from '@/features/studio/hooks/useTimelinePlaybackMonitor';
import type { VideoAudioGraph } from '@/features/audio/hooks/useAudioEngine';
import { StudioTimeline } from '@/features/studio/components/StudioTimeline';
import { TimelineContextMenu } from '@/features/studio/components/TimelineContextMenu';
import { TimelineEditingTools } from '@/features/studio/components/TimelineEditingTools';
import { TimelinePlaybackControls } from '@/features/studio/components/TimelinePlaybackControls';
import { TimelineViewTools } from '@/features/studio/components/TimelineViewTools';
import { useTimelineSelection } from '@/features/studio/hooks/useTimelineSelection';
import { useTimelineZoomPreview } from '@/features/studio/hooks/useTimelineZoomPreview';
import { useTimelineUiStore } from '@/features/studio/store/useTimelineUiStore';

interface TimelineBarProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  timelineAudioRef: RefObject<HTMLMediaElement | null>;
  connectVideoAudioGraph: (video: HTMLVideoElement) => Promise<VideoAudioGraph>;
  connectTimelineAudioGraph: (media: HTMLMediaElement) => Promise<AnalyserNode | null>;
  onToggleSyncPlayback: () => void;
}

export function TimelineBar({
  videoRef,
  timelineAudioRef,
  connectVideoAudioGraph,
  connectTimelineAudioGraph,
  onToggleSyncPlayback,
}: TimelineBarProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const projectId = useAppStore((s) => s.projectId);
  const currentTime = useAppStore((s) => s.currentTime);
  const duration = useAppStore((s) => s.duration);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const isSyncPlaying = useAppStore((s) => s.isSyncPlaying);
  const { displayZoom, isZooming, setZoom, zoomSliderProps } = useTimelineZoomPreview();
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const addTimelineClip = useAppStore((s) => s.addTimelineClip);
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);
  const togglePreviewFullscreen = useAppStore((s) => s.togglePreviewFullscreen);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);
  const canvasPreviewAxis = useAppStore((s) => s.canvasPreviewAxis);
  const canvasAttachSnap = useAppStore((s) => s.canvasAttachSnap);
  const toggleCanvasPreviewAxis = useAppStore((s) => s.toggleCanvasPreviewAxis);
  const toggleCanvasAttachSnap = useAppStore((s) => s.toggleCanvasAttachSnap);
  const timelineSnappingEnabled = useTimelineUiStore((s) => s.snappingEnabled);
  const toggleTimelineSnapping = useTimelineUiStore((s) => s.toggleSnapping);
  const timelineRippleEditEnabled = useTimelineUiStore((s) => s.rippleEditEnabled);
  const toggleRippleEdit = useTimelineUiStore((s) => s.toggleRippleEdit);
  const isTimelinePlaying = useAppStore((s) => s.isTimelinePlaying);
  const toggleTimelinePlaying = useAppStore((s) => s.toggleTimelinePlaying);
  const seekTimeline = useAppStore((s) => s.seekTimeline);
  const splitTimelineRemoveSide = useAppStore((s) => s.splitTimelineRemoveSide);
  const detachAudioFromVideoClip = useAppStore((s) => s.detachAudioFromVideoClip);
  const timelineBookmarks = useAppStore((s) => s.timelineBookmarks);
  const toggleTimelineBookmarkAtPlayhead = useAppStore(
    (s) => s.toggleTimelineBookmarkAtPlayhead,
  );
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const {
    primary: selectedTimelineClip,
    deleteSelection,
    copySelection,
    cutSelection,
    pasteSelection,
    duplicateSelection,
    splitAtPlayhead,
    hasClipboard,
    hasSelection,
    canDelete,
    canEditCanvas,
    canSplit,
  } = useTimelineSelection();

  const [barMenu, setBarMenu] = useState<{ x: number; y: number } | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const isPaused = !isTimelinePlaying;
  const audioReadout = useTimelinePlaybackMonitor(
    videoRef,
    timelineAudioRef,
    connectVideoAudioGraph,
    connectTimelineAudioGraph,
    !isPaused,
  );

  const openInspector = () => {
    setActiveTab('inspector');
    setEditorOpen(true);
  };

  const isVideoClipSelected = Boolean(
    selectedTimelineClip &&
      String(selectedTimelineClip.trackId).startsWith('video'),
  );
  const isBookmarkedAtPlayhead = timelineBookmarks.some(
    (b) => Math.abs(b - currentTime) < 0.1,
  );

  if (!videoUrl && !projectId) return null;

  return (
    <div
      ref={dockRef}
      className="studio-editor-dock"
      onContextMenu={(e) => {
        if (!dockRef.current?.contains(e.target as Node)) return;
        if ((e.target as HTMLElement).closest('[data-slot="context-menu-content"]')) return;
        if ((e.target as HTMLElement).closest('.studio-timeline-context-menu')) return;
        if ((e.target as HTMLElement).closest('.studio-timeline-scroll')) return;
        e.preventDefault();
        setBarMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div className="studio-playback-bar">
        <TimelineEditingTools
          canSplit={canSplit}
          canDelete={canDelete}
          canDuplicate={hasSelection}
          canSeparateAudio={isVideoClipSelected}
          isBookmarked={isBookmarkedAtPlayhead}
          onSplit={splitAtPlayhead}
          onSplitRemoveLeft={() => splitTimelineRemoveSide('left')}
          onSplitRemoveRight={() => splitTimelineRemoveSide('right')}
          onSeparateAudio={() => detachAudioFromVideoClip()}
          onDelete={deleteSelection}
          onDuplicate={duplicateSelection}
          onToggleBookmark={toggleTimelineBookmarkAtPlayhead}
        />

        <TimelinePlaybackControls
          isPaused={isPaused}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={toggleTimelinePlaying}
          audioReadout={audioReadout}
        />

        <TimelineViewTools
          hasVoiceover={Boolean(audioBase64)}
          isSyncPlaying={isSyncPlaying}
          canvasPreviewAxis={canvasPreviewAxis}
          canvasAttachSnap={canvasAttachSnap}
          timelineSnappingEnabled={timelineSnappingEnabled}
          timelineRippleEditEnabled={timelineRippleEditEnabled}
          timelineZoom={displayZoom}
          previewFullscreenOpen={previewFullscreenOpen}
          onToggleSyncPlayback={onToggleSyncPlayback}
          onTogglePreviewAxis={toggleCanvasPreviewAxis}
          onToggleAttachSnap={toggleCanvasAttachSnap}
          onToggleTimelineSnap={toggleTimelineSnapping}
          onToggleRippleEdit={toggleRippleEdit}
          onZoomChange={setZoom}
          zoomSliderProps={zoomSliderProps}
          onToggleFullscreen={togglePreviewFullscreen}
          onOpenVoiceTools={() => {
            setActiveStudioTool('audio');
            setToolsDrawerOpen(true);
          }}
        />
      </div>

      <StudioTimeline
        videoRef={videoRef}
        isPlaying={!isPaused}
        timelineZoom={displayZoom}
        isZooming={isZooming}
        onZoomChange={setZoom}
        playbackAudioHot={audioReadout.isHighVolume}
        playbackAudioClipping={audioReadout.isClipping}
        playbackPeakLevel={audioReadout.peakLevel}
      />

      <TimelineContextMenu
        target={barMenu ? { x: barMenu.x, y: barMenu.y, time: currentTime } : null}
        onClose={() => setBarMenu(null)}
        onSeek={seekTimeline}
        onSplit={splitAtPlayhead}
        onDelete={deleteSelection}
        onCopy={copySelection}
        onCut={cutSelection}
        onPaste={(atTime) => pasteSelection(atTime)}
        onDuplicate={duplicateSelection}
        onAddClip={(trackId) => addTimelineClip(trackId, currentTime)}
        onEditCanvas={() => {
          if (!selectedTimelineClip) return;
          const clipId = selectedTimelineClip.clipId;
          const isCanvasClip = useAppStore
            .getState()
            .canvasElements.some((el) => el.id === clipId);
          if (isCanvasClip) selectCanvasElement(clipId);
          openInspector();
        }}
        canSplit={canSplit}
        canDelete={canDelete}
        canEditCanvas={canEditCanvas}
        hasClipboard={hasClipboard}
      />
    </div>
  );
}
