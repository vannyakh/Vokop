import { useRef, type CSSProperties, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/features/project';
import {
  getDisplayRatio,
  isPortraitRatio,
} from '@/features/studio/constants/aspectRatios';
import { CanvasEditorStage } from '@/features/studio/components/CanvasEditorStage';
import { cn } from '@/lib/cn';

interface VideoViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

const STATUS_LABELS: Record<string, string> = {
  transcribing: 'Transcribing',
  translating: 'Translating',
  speaking: 'Generating voice',
  analyzing: 'Analyzing',
};

export function VideoViewport({ videoRef }: VideoViewportProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const videoUrl = useAppStore((s) => s.videoUrl);
  const videoFile = useAppStore((s) => s.videoFile);
  const status = useAppStore((s) => s.status);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const setDuration = useAppStore((s) => s.setDuration);
  const setVideoDimensions = useAppStore((s) => s.setVideoDimensions);

  const displayRatio = getDisplayRatio(aspectRatio, videoWidth, videoHeight);
  const portrait = displayRatio != null && isPortraitRatio(displayRatio);

  if (!videoUrl) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) void videoRef.current.play();
    else videoRef.current.pause();
  };

  return (
    <div className="studio-viewport">
      <div className="studio-viewport-frame">
        <div
          ref={wrapRef}
          className={cn(
            'studio-viewport-video-wrap',
            displayRatio != null && 'studio-viewport-video-wrap--ratio',
            portrait && 'studio-viewport-video-wrap--portrait',
          )}
          style={
            displayRatio != null
              ? ({ '--viewport-ratio': String(displayRatio) } as CSSProperties)
              : undefined
          }
        >
          <video
            ref={videoRef}
            key={videoUrl}
            className="studio-video-player"
            playsInline
            preload="auto"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration);
              setVideoDimensions(e.currentTarget.videoWidth, e.currentTarget.videoHeight);
            }}
            onClick={() => {
              if (canvasTool === 'pan') togglePlay();
            }}
          >
            <source src={videoUrl} type={videoFile?.type} />
          </video>

          <CanvasEditorStage wrapRef={wrapRef} onBackgroundClick={togglePlay} />

          {status !== 'idle' && status !== 'error' && (
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="studio-panel px-6 py-5 flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-accent" size={28} />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted font-mono">
                  {STATUS_LABELS[status] ?? status}…
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
