import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { preloadLocalFonts } from '@/assets/support';
import { useAppStore } from '@/features/project';
import { useAudioEngine, useSyncPlayback, useReelPlayback, useVideoExport } from '@/features/audio';
import { useVideoProcessing } from '@/features/translation';
import { AppHeader } from '@/features/studio/components/AppHeader';
import { StudioToolsDock } from '@/features/studio/components/StudioToolsDock';
import { VideoViewport } from '@/features/studio/components/VideoViewport';
import { TimelineBar } from '@/features/studio/components/TimelineBar';
import { EditorSidebar } from '@/features/studio/components/EditorSidebar';
import { CinemaPreviewOverlay } from '@/features/studio/components/CinemaPreviewOverlay';
import { ExportVideoModal } from '@/features/studio/components/ExportVideoModal';
import { useVideoSession } from '@/features/studio/hooks/useVideoSession';
import { useCanvasKeyboardShortcuts } from '@/features/studio/hooks/useCanvasKeyboardShortcuts';
import { useTimelineDockSplit } from '@/features/studio/hooks/useTimelineDockSplit';
import { useTimelinePlayback } from '@/features/studio/hooks/useTimelinePlayback';
import { useLinkedVideoAudioPlayback } from '@/features/studio/hooks/useLinkedVideoAudioPlayback';
import { TemplateSlotBanner } from '@/features/studio/components/TemplateSlotBanner';
import { StudioProjectStatusBar } from '@/features/studio/components/StudioProjectStatusBar';
import type { ExportSettings } from '@/features/studio/lib/exportSettings';

export function StudioWorkspace() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoUrl = useAppStore((s) => s.videoUrl);
  const projectId = useAppStore((s) => s.projectId);
  const isExporting = useAppStore((s) => s.isExporting);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const { containerRef, dockShellRef, dockHeight, dragging, splitterProps } = useTimelineDockSplit();
  useCanvasKeyboardShortcuts(videoRef);
  useTimelinePlayback(videoRef);
  const { timelineAudioRef } = useLinkedVideoAudioPlayback(videoRef);
  useVideoSession();

  useEffect(() => {
    preloadLocalFonts();
  }, []);

  const { audioContextRef, audioSourceRef, videoSourceRef, connectVideoAudioGraph, connectTimelineAudioGraph, stopAudio, playSegment } =
    useAudioEngine();
  const { previewVoice, regenerateVoiceover } = useVideoProcessing();

  const syncRefs = {
    videoRef,
    audioContextRef,
    audioSourceRef,
    videoSourceRef,
    connectVideoAudioGraph,
    stopAudio,
    playSegment,
  };

  const { playMixedAudio, toggleSyncPlayback, handlePlayAnalysis } = useSyncPlayback(syncRefs);
  const { exportVideo } = useVideoExport({
    videoRef,
    audioContextRef,
    videoSourceRef,
    connectVideoAudioGraph,
    playMixedAudio,
  });
  const { startReel } = useReelPlayback(videoRef, audioContextRef, audioSourceRef, stopAudio);

  const handlePreviewVoice = (speaker: string) => {
    stopAudio();
    if (videoRef.current) videoRef.current.pause();
    previewVoice(speaker, playSegment);
  };

  const handleExport = (settings: ExportSettings) => {
    setExportModalOpen(false);
    void exportVideo(settings);
  };

  return (
    <div className="studio-shell h-full min-h-screen flex flex-col overflow-hidden relative">
      <AppHeader onExport={() => setExportModalOpen(true)} />
      <TemplateSlotBanner />

      <div className="flex-1 flex overflow-hidden relative z-10">
        <StudioToolsDock
          videoRef={videoRef}
          onPreviewVoice={handlePreviewVoice}
          onRegenerateVoiceover={regenerateVoiceover}
        />

        <main ref={containerRef} className="studio-main studio-main-split">
          <div className="studio-preview-pane">
            <VideoViewport videoRef={videoRef} />
          </div>

          {(videoUrl || projectId) && (
            <>
              <div
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize timeline panel"
                aria-valuenow={Math.round(dockHeight)}
                className={cn('studio-panel-splitter', dragging && 'is-dragging')}
                {...splitterProps}
              />
              <div
                ref={dockShellRef}
                className={cn('studio-editor-dock-shell', dragging && 'is-resizing')}
                style={{ height: dockHeight }}
              >
                <TimelineBar
                  videoRef={videoRef}
                  timelineAudioRef={timelineAudioRef}
                  connectVideoAudioGraph={connectVideoAudioGraph}
                  connectTimelineAudioGraph={connectTimelineAudioGraph}
                  onToggleSyncPlayback={toggleSyncPlayback}
                />
              </div>
            </>
          )}
        </main>

        <EditorSidebar
          videoRef={videoRef}
          onPlayAnalysis={handlePlayAnalysis}
          onStartReel={startReel}
        />
      </div>

      <StudioProjectStatusBar />

      <CinemaPreviewOverlay videoRef={videoRef} />

      <ExportVideoModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
}
