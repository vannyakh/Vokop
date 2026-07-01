import { useRef } from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useAudioEngine, useSyncPlayback, useReelPlayback, useVideoExport } from '@/features/audio';
import { useVideoProcessing } from '@/features/translation';
import { StudioBackground } from '@/features/studio/components/StudioBackground';
import { AppHeader } from '@/features/studio/components/AppHeader';
import { SettingsSidebar } from '@/features/studio/components/SettingsSidebar';
import { VideoViewport } from '@/features/studio/components/VideoViewport';
import { TimelineBar } from '@/features/studio/components/TimelineBar';
import { EditorSidebar } from '@/features/studio/components/EditorSidebar';
import { IconButton } from '@/components/ui/IconButton';

export function StudioWorkspace() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
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
    <div className="h-full min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col overflow-hidden relative">
      <StudioBackground />
      <AppHeader onExport={exportVideo} />

      <div className="flex-1 flex overflow-hidden relative z-10">
        <SettingsSidebar videoRef={videoRef} onPreviewVoice={handlePreviewVoice} />

        {!sidebarOpen && (
          <IconButton
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-20 studio-glass"
            title="Open settings"
          >
            <PanelLeft size={18} />
          </IconButton>
        )}

        <main className="flex-1 flex flex-col min-w-0 relative">
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
            className="absolute top-3 right-3 z-20 studio-glass"
            title="Open editor"
          >
            <PanelRight size={18} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
