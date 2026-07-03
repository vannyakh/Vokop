import { useRef, useState, type CSSProperties, type DragEvent, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/features/project';
import {
  getDisplayRatio,
  isPortraitRatio,
} from '@/features/studio/constants/aspectRatios';
import {
  TEXT_TEMPLATE_DRAG_MIME,
  type TextTemplateInput,
} from '@/features/studio/constants/textTemplates';
import { CanvasEditorStage } from '@/features/studio/components/CanvasEditorStage';
import { clampCanvasPoint, clientToCanvas } from '@/features/studio/lib/canvasCoords';
import { computeTemplatePlacement } from '@/features/studio/lib/textTemplatePlacement';
import { cn } from '@/lib/cn';

interface VideoPreviewFrameProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  cinema?: boolean;
  onTogglePlay?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  transcribing: 'Transcribing',
  translating: 'Translating',
  speaking: 'Generating voice',
  analyzing: 'Analyzing',
};

export function VideoPreviewFrame({ videoRef, cinema = false, onTogglePlay }: VideoPreviewFrameProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const videoUrl = useAppStore((s) => s.videoUrl);
  const videoFile = useAppStore((s) => s.videoFile);
  const status = useAppStore((s) => s.status);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const addTextTemplate = useAppStore((s) => s.addTextTemplate);
  const setMediaDuration = useAppStore((s) => s.setMediaDuration);
  const setVideoDimensions = useAppStore((s) => s.setVideoDimensions);
  const toggleTimelinePlaying = useAppStore((s) => s.toggleTimelinePlaying);
  const videoClips = useAppStore((s) => s.videoClips);
  const currentTime = useAppStore((s) => s.currentTime);
  const videoCssFilter = useAppStore((s) => s.getVideoCssFilter());
  const hasActiveVideoClip =
    videoClips.length === 0
      ? Boolean(videoUrl)
      : videoClips.some(
          (clip) => currentTime >= clip.start && currentTime < clip.start + clip.duration,
        );

  const displayRatio = getDisplayRatio(aspectRatio, videoWidth, videoHeight);
  const portrait = displayRatio != null && isPortraitRatio(displayRatio);

  const togglePlay = () => {
    if (onTogglePlay) {
      onTogglePlay();
      return;
    }
    toggleTimelinePlaying();
  };

  const isTemplateDrag = (e: DragEvent) => e.dataTransfer.types.includes(TEXT_TEMPLATE_DRAG_MIME);

  const onDragOver = (e: DragEvent) => {
    if (!isTemplateDrag(e) || cinema) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  };

  const onDragLeave = (e: DragEvent) => {
    if (!wrapRef.current?.contains(e.relatedTarget as Node)) setDropActive(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (cinema || !wrapRef.current) return;

    const raw = e.dataTransfer.getData(TEXT_TEMPLATE_DRAG_MIME);
    if (!raw) return;

    let template: TextTemplateInput;
    try {
      template = JSON.parse(raw) as TextTemplateInput;
    } catch {
      return;
    }

    const wrap = wrapRef.current;
    const canvasW = wrap.offsetWidth;
    const canvasH = wrap.offsetHeight;
    const { x, y } = clientToCanvas(wrap, e.clientX, e.clientY);
    const placement = computeTemplatePlacement(template.verticalAlign, template.style.fontSize, {
      width: canvasW,
      height: canvasH,
    });
    const centered = clampCanvasPoint(
      x - placement.width / 2,
      y - placement.height / 2,
      { width: placement.width, height: placement.height },
      { width: canvasW, height: canvasH },
    );

    addTextTemplate(template, {
      x: centered.x,
      y: centered.y,
      canvasWidth: canvasW,
      canvasHeight: canvasH,
    });
  };

  return (
    <div
      className={cn(
        'studio-viewport-video-wrap',
        displayRatio != null && 'studio-viewport-video-wrap--ratio',
        portrait && 'studio-viewport-video-wrap--portrait',
        cinema && 'studio-viewport-video-wrap--cinema',
        dropActive && 'studio-viewport-video-wrap--drop-target',
      )}
      ref={wrapRef}
      style={
        displayRatio != null
          ? ({ '--viewport-ratio': String(displayRatio) } as CSSProperties)
          : undefined
      }
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
        <video
          ref={videoRef}
          key={videoUrl ?? undefined}
          className={cn('studio-video-player', !hasActiveVideoClip && videoUrl && 'studio-video-player--gap')}
          style={videoCssFilter !== 'none' ? { filter: videoCssFilter } : undefined}
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => {
            setMediaDuration(e.currentTarget.duration);
            setVideoDimensions(e.currentTarget.videoWidth, e.currentTarget.videoHeight);
          }}
          onClick={() => {
            if (cinema || canvasTool === 'pan') togglePlay();
          }}
        >
          {videoUrl && <source src={videoUrl} type={videoFile?.type} />}
        </video>

        <CanvasEditorStage wrapRef={wrapRef} onBackgroundClick={togglePlay} previewMode={cinema} />

        {dropActive && (
          <div className="studio-viewport-drop-hint" aria-hidden>
            Drop text here
          </div>
        )}

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
  );
}
