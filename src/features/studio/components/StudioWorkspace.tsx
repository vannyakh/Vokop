import { useRef } from 'react';
import { PanelRight } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useAudioEngine, useSyncPlayback, useReelPlayback, useVideoExport } from '@/features/audio';
import { useVideoProcessing } from '@/features/translation';
import { AppHeader } from '@/features/studio/components/AppHeader';
import { StudioToolsDock } from '@/features/studio/components/StudioToolsDock';
import { VideoViewport } from '@/features/studio/components/VideoViewport';
import { TimelineBar } from '@/features/studio/components/TimelineBar';
import { EditorSidebar } from '@/features/studio/components/EditorSidebar';
import { IconButton } from '@/components/ui/IconButton';

export function StudioWorkspace() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const editorOpen = useAppStore((s) => s.editorOpen);

  const { audioContextRef, audioSourceRef, videoSourceRef, stopAudio, playSegment } =
    useAudioEngine();
  const { processAll, previewVoice } = useVideoProcessing();

  const syncRefs = {
    videoRef,
    audioContextRef,
    audioSourceRef,
    videoSourceRef,
    stopAudio,
    playSegment,
  };

  const { playMixedAudio, toggleSyncPlayback, handlePlayAnalysis } = useSyncPlayback(syncRefs);
  const { exportVideo } = useVideoExport({
    videoRef,
    audioContextRef,
    videoSourceRef,
    playMixedAudio,
  });
  const { startReel } = useReelPlayback(videoRef, audioContextRef, audioSourceRef, stopAudio);

  const handlePreviewVoice = (speaker: string) => {
    stopAudio();
    if (videoRef.current) videoRef.current.pause();
    previewVoice(speaker, playSegment);
  };

  return (
    <div className="studio-shell h-full min-h-screen flex flex-col overflow-hidden relative">
      <AppHeader onExport={exportVideo} />

      <div className="flex-1 flex overflow-hidden relative z-10">
        <StudioToolsDock videoRef={videoRef} onPreviewVoice={handlePreviewVoice} />

        <main className="studio-main studio-main-split">
          <VideoViewport videoRef={videoRef} />
          <TimelineBar
            videoRef={videoRef}
            onProcessAll={processAll}
            onToggleSyncPlayback={toggleSyncPlayback}
          />
        </main>

        <EditorSidebar
          videoRef={videoRef}
          onPlayAnalysis={handlePlayAnalysis}
          onStartReel={startReel}
        />

        {!editorOpen && (
          <IconButton
            onClick={() => setEditorOpen(true)}
            className="studio-panel-trigger studio-panel-trigger--right"
            title="Open editor"
          >
            <PanelRight size={18} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
