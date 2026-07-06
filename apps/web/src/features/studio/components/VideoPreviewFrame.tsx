import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useTranslation } from '@/features/settings';
import {
  getDisplayRatio,
} from '@/features/studio/constants/aspectRatios';
import { CanvasEditorStage } from '@/features/studio/components/CanvasEditorStage';
import { CompositionBackgroundLayer } from '@/features/studio/components/CompositionBackgroundLayer';
import {
  getVideoContentRect,
} from '@/features/studio/lib/canvasCoords';
import { isBackgroundActive, resolvePreviewBackground } from '@/features/studio/lib/compositionBackground';
import { DEFAULT_COMPOSITION_BACKGROUND } from '@vokop/shared';
import { findVideoClipForPreview, listVideoTrackIds } from '@/features/studio/lib/mediaClips';
import { resolveVideoClipLayout, type VideoClipLayout } from '@/features/studio/lib/videoClipLayout';
import { cn } from '@/lib/cn';

interface VideoPreviewFrameProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  wrapRef?: RefObject<HTMLDivElement | null>;
  cinema?: boolean;
  onTogglePlay?: () => void;
  dropActive?: boolean;
  dropHint?: string;
  externalDrag?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  transcribing: 'Transcribing',
  translating: 'Translating',
  speaking: 'Generating voice',
  analyzing: 'Analyzing',
};

export function VideoPreviewFrame({
  videoRef,
  wrapRef: wrapRefProp,
  cinema = false,
  onTogglePlay,
  dropActive = false,
  dropHint = '',
  externalDrag = false,
}: VideoPreviewFrameProps) {
  const { t } = useTranslation();
  const internalWrapRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = wrapRefProp ?? internalWrapRef;
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [liveVideoLayout, setLiveVideoLayout] = useState<VideoClipLayout | null>(null);

  const videoUrl = useAppStore((s) => s.videoUrl);
  const videoFile = useAppStore((s) => s.videoFile);
  const status = useAppStore((s) => s.status);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const currentTime = useAppStore((s) => s.currentTime);
  const setMediaDuration = useAppStore((s) => s.setMediaDuration);
  const setVideoDimensions = useAppStore((s) => s.setVideoDimensions);
  const toggleTimelinePlaying = useAppStore((s) => s.toggleTimelinePlaying);
  const videoClips = useAppStore((s) => s.videoClips);
  const extraTimelineTracks = useAppStore((s) => s.extraTimelineTracks);
  const timelineTrackOrder = useAppStore((s) => s.timelineTrackOrder);
  const timelineTrackHidden = useAppStore((s) => s.timelineTrackHidden);
  const timelineTrackPreviewHidden = useAppStore((s) => s.timelineTrackPreviewHidden);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const compositionBackground = useAppStore(
    (s) => s.projectEditor.compositionBackground ?? DEFAULT_COMPOSITION_BACKGROUND,
  );
  const mediaAssets = useAppStore((s) => s.mediaAssets);
  const videoCssFilter = useAppStore((s) => s.getVideoCssFilter());
  const videoTrackIds = useMemo(
    () => listVideoTrackIds(extraTimelineTracks, timelineTrackOrder, timelineTrackHidden),
    [extraTimelineTracks, timelineTrackOrder, timelineTrackHidden],
  );
  const activeVideoClip = useMemo(
    () =>
      videoClips.length === 0
        ? null
        : findVideoClipForPreview(
            videoClips,
            currentTime,
            videoTrackIds,
            timelineTrackPreviewHidden,
          ),
    [videoClips, currentTime, videoTrackIds, timelineTrackPreviewHidden],
  );
  const hasActiveVideoClip = Boolean(activeVideoClip);
  const isEmptyCanvas = !videoUrl && videoClips.length === 0;

  const displayRatio = getDisplayRatio(aspectRatio, videoWidth, videoHeight);
  const frameRatioStyle =
    displayRatio != null
      ? ({ '--viewport-ratio': String(displayRatio) } as CSSProperties)
      : videoWidth > 0 && videoHeight > 0
        ? ({ '--viewport-ratio': String(videoWidth / videoHeight) } as CSSProperties)
        : ({ '--viewport-ratio': '1.777' } as CSSProperties);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => {
      setFrameSize({
        width: Math.floor(wrap.offsetWidth),
        height: Math.floor(wrap.offsetHeight),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wrapRef]);

  const contentRect = useMemo(
    () =>
      getVideoContentRect(
        frameSize,
        { width: videoWidth, height: videoHeight },
        displayRatio,
      ),
    [frameSize, videoWidth, videoHeight, displayRatio],
  );
  const videoLayout = useMemo(
    () => liveVideoLayout ?? resolveVideoClipLayout(activeVideoClip, contentRect, currentTime),
    [liveVideoLayout, activeVideoClip, contentRect, currentTime],
  );
  const effectiveBackground = useMemo(
    () =>
      resolvePreviewBackground(
        activeVideoClip,
        compositionBackground,
        selectedTimelineClip?.clipId,
      ),
    [activeVideoClip, compositionBackground, selectedTimelineClip?.clipId],
  );
  const showBackground = frameSize.width > 0 && isBackgroundActive(effectiveBackground);
  const wrapBackgroundStyle =
    effectiveBackground.mode === 'color' && isBackgroundActive(effectiveBackground)
      ? { backgroundColor: effectiveBackground.color ?? '#000000' }
      : undefined;

  useEffect(() => {
    setLiveVideoLayout(null);
  }, [
    activeVideoClip?.id,
    selectedTimelineClip?.clipId,
    contentRect.x,
    contentRect.y,
    contentRect.width,
    contentRect.height,
  ]);

  const composedStyle: CSSProperties | undefined =
    hasActiveVideoClip && frameSize.width > 0
      ? (() => {
          const transforms: string[] = [];
          if (activeVideoClip?.flipX) transforms.push('scaleX(-1)');
          if (activeVideoClip?.flipY) transforms.push('scaleY(-1)');
          if (videoLayout.rotation !== 0) transforms.push(`rotate(${videoLayout.rotation}deg)`);
          const usesCenter =
            transforms.length > 0 || videoLayout.rotation !== 0;
          return {
            left: usesCenter ? videoLayout.x + videoLayout.width / 2 : videoLayout.x,
            top: usesCenter ? videoLayout.y + videoLayout.height / 2 : videoLayout.y,
            width: videoLayout.width,
            height: videoLayout.height,
            opacity: videoLayout.opacity,
            transformOrigin: 'center center',
            transform: usesCenter
              ? `translate(-50%, -50%) ${transforms.join(' ')}`.trim()
              : undefined,
            ...(videoCssFilter !== 'none' ? { filter: videoCssFilter } : {}),
          };
        })()
      : videoCssFilter !== 'none'
        ? { filter: videoCssFilter }
        : undefined;

  const togglePlay = () => {
    if (onTogglePlay) {
      onTogglePlay();
      return;
    }
    toggleTimelinePlaying();
  };

  return (
    <div
      className={cn(
        'studio-viewport-video-wrap',
        'studio-viewport-video-wrap--ratio',
        cinema && 'studio-viewport-video-wrap--cinema',
        dropActive && 'studio-viewport-video-wrap--drop-target',
      )}
      ref={wrapRef}
      style={{ ...frameRatioStyle, ...wrapBackgroundStyle }}
    >
        {isEmptyCanvas && !dropActive && (
          <div className="studio-canvas-empty" aria-hidden>
            <p className="studio-canvas-empty-title">{t('emptyCanvasTitle')}</p>
            <p className="studio-canvas-empty-hint">{t('emptyCanvasHint')}</p>
          </div>
        )}

        {showBackground && effectiveBackground.mode !== 'color' && (
          <CompositionBackgroundLayer
            contentRect={contentRect}
            background={effectiveBackground}
            videoRef={videoRef}
            videoUrl={videoUrl}
            activeClip={activeVideoClip}
            mediaAssets={mediaAssets}
          />
        )}

        <video
          ref={videoRef}
          key={videoUrl ?? undefined}
          className={cn(
            'studio-video-player',
            hasActiveVideoClip && frameSize.width > 0 && 'studio-video-player--composed',
            liveVideoLayout && 'studio-video-player--live-transform',
            !hasActiveVideoClip && videoUrl && 'studio-video-player--gap',
          )}
          style={composedStyle}
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

        <CanvasEditorStage
          wrapRef={wrapRef}
          onBackgroundClick={togglePlay}
          previewMode={cinema}
          dropPassthrough={externalDrag}
          onVideoLiveLayoutChange={setLiveVideoLayout}
        />

        {dropActive && (
          <div className="studio-viewport-drop-hint" aria-hidden>
            {dropHint || t('canvasDropToAdd')}
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
