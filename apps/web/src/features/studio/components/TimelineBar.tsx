import { useRef, useState, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { isEditableTimelineTrack } from '@/features/studio/lib/timelineTrackUtils';
import { StudioTimeline } from '@/features/studio/components/StudioTimeline';
import { TimelineContextMenu } from '@/features/studio/components/TimelineContextMenu';
import { TimelineEditingTools } from '@/features/studio/components/TimelineEditingTools';
import { TimelinePlaybackControls } from '@/features/studio/components/TimelinePlaybackControls';
import { TimelineViewTools } from '@/features/studio/components/TimelineViewTools';
import { useTranscriptReady } from '@/features/studio/hooks/useTranscriptReady';

interface TimelineBarProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onProcessAll: () => void;
  onToggleSyncPlayback: () => void;
}

export function TimelineBar({ videoRef, onProcessAll, onToggleSyncPlayback }: TimelineBarProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const projectId = useAppStore((s) => s.projectId);
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
  const isTimelinePlaying = useAppStore((s) => s.isTimelinePlaying);
  const toggleTimelinePlaying = useAppStore((s) => s.toggleTimelinePlaying);
  const seekTimeline = useAppStore((s) => s.seekTimeline);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const transcriptReady = useTranscriptReady();

  const [barMenu, setBarMenu] = useState<{ x: number; y: number } | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const isPaused = !isTimelinePlaying;

  const openInspector = () => {
    setActiveTab('inspector');
    setEditorOpen(true);
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
    transcriptReady &&
    (selectedTimelineClip?.trackId === 'text' ||
      selectedTimelineClip?.trackId === 'video' ||
      selectedTimelineClip?.trackId === 'audio' ||
      (selectedTimelineClip?.trackId === 'overlay' &&
        selectedTimelineClip.clipId &&
        !selectedTimelineClip.clipId.startsWith('logo-') &&
        !selectedTimelineClip.clipId.startsWith('image-')));

  if (!videoUrl && !projectId) return null;

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
        <TimelineEditingTools
          canSplit={canSplit}
          canDelete={canDelete}
          processBusy={status !== 'idle'}
          onSplit={splitTimelineAtPlayhead}
          onDelete={handleDeleteSelected}
          onProcessAll={onProcessAll}
        />

        <TimelinePlaybackControls
          isPaused={isPaused}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={toggleTimelinePlaying}
        />

        <TimelineViewTools
          hasVoiceover={Boolean(audioBase64)}
          isSyncPlaying={isSyncPlaying}
          canvasPreviewAxis={canvasPreviewAxis}
          canvasAttachSnap={canvasAttachSnap}
          timelineZoom={timelineZoom}
          previewFullscreenOpen={previewFullscreenOpen}
          onToggleSyncPlayback={onToggleSyncPlayback}
          onTogglePreviewAxis={toggleCanvasPreviewAxis}
          onToggleAttachSnap={toggleCanvasAttachSnap}
          onZoomChange={setTimelineZoom}
          onToggleFullscreen={togglePreviewFullscreen}
        />
      </div>

      <StudioTimeline videoRef={videoRef} isPlaying={!isPaused} />

      <TimelineContextMenu
        target={barMenu ? { x: barMenu.x, y: barMenu.y, time: currentTime } : null}
        onClose={() => setBarMenu(null)}
        onSeek={seekTimeline}
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
        canEditCanvas={isEditableTimelineTrack(selectedTimelineClip?.trackId)}
        hasClipboard={Boolean(timelineClipboard?.length)}
      />
    </div>
  );
}
