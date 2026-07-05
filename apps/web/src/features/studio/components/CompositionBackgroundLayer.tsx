import { useEffect, useRef, type RefObject } from 'react';
import type { CompositionBackground } from '@vokop/shared';
import { blurLevelToPx, findBackgroundImagePreset } from '@vokop/shared';
import { useAppStore } from '@/features/project';
import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import { resolvePreviewVideoSourceUrl } from '@/features/studio/lib/compositionBackground';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

interface CompositionBackgroundLayerProps {
  contentRect: CanvasRect;
  background: CompositionBackground;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string | null;
  activeClip: MediaClip | null;
  mediaAssets: MediaAsset[];
}

/** Keep the blur `<video>` locked to the master preview element (play/pause/seek). */
function bindBlurToMaster(main: HTMLVideoElement, blurVideo: HTMLVideoElement): () => void {
  let raf = 0;

  const syncTime = () => {
    if (!Number.isFinite(main.currentTime)) return;
    blurVideo.playbackRate = main.playbackRate;
    if (Math.abs(blurVideo.currentTime - main.currentTime) > 0.001) {
      try {
        blurVideo.currentTime = main.currentTime;
      } catch {
        /* ignore seek races while loading */
      }
    }
  };

  const syncPlayback = () => {
    syncTime();
    if (main.paused) {
      blurVideo.pause();
      cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    if (blurVideo.paused) {
      void blurVideo.play().catch(() => undefined);
    }
    if (!raf) {
      const tick = () => {
        syncTime();
        if (!main.paused) {
          raf = requestAnimationFrame(tick);
        } else {
          raf = 0;
        }
      };
      raf = requestAnimationFrame(tick);
    }
  };

  syncPlayback();

  main.addEventListener('play', syncPlayback);
  main.addEventListener('pause', syncPlayback);
  main.addEventListener('seeking', syncTime);
  main.addEventListener('seeked', syncTime);
  main.addEventListener('ratechange', syncPlayback);
  main.addEventListener('loadedmetadata', syncPlayback);

  return () => {
    cancelAnimationFrame(raf);
    main.removeEventListener('play', syncPlayback);
    main.removeEventListener('pause', syncPlayback);
    main.removeEventListener('seeking', syncTime);
    main.removeEventListener('seeked', syncTime);
    main.removeEventListener('ratechange', syncPlayback);
    main.removeEventListener('loadedmetadata', syncPlayback);
    blurVideo.pause();
  };
}

export function CompositionBackgroundLayer({
  contentRect,
  background,
  videoRef,
  videoUrl,
  activeClip,
  mediaAssets,
}: CompositionBackgroundLayerProps) {
  const blurVideoRef = useRef<HTMLVideoElement>(null);
  const isTimelinePlaying = useAppStore((s) => s.isTimelinePlaying);
  const rectStyle = {
    left: contentRect.x,
    top: contentRect.y,
    width: contentRect.width,
    height: contentRect.height,
  };

  const sourceUrl = resolvePreviewVideoSourceUrl(
    videoRef.current,
    videoUrl,
    activeClip,
    mediaAssets,
  );

  useEffect(() => {
    if (background.mode !== 'blur') return;
    const main = videoRef.current;
    const blurVideo = blurVideoRef.current;
    if (!blurVideo) return;

    const url = resolvePreviewVideoSourceUrl(main, videoUrl, activeClip, mediaAssets);
    if (!url) return;

    if (blurVideo.src !== url) {
      blurVideo.src = url;
      blurVideo.load();
    }

    if (!main) return;

    return bindBlurToMaster(main, blurVideo);
  }, [
    background.mode,
    background.blurLevel,
    videoUrl,
    activeClip?.id,
    activeClip?.mediaAssetId,
    mediaAssets,
    videoRef,
  ]);

  // Timeline pause can arrive before the master `<video>` pause event — force blur to stop.
  useEffect(() => {
    if (background.mode !== 'blur') return;
    if (isTimelinePlaying) return;
    blurVideoRef.current?.pause();
    const main = videoRef.current;
    const blurVideo = blurVideoRef.current;
    if (main && blurVideo && Number.isFinite(main.currentTime)) {
      try {
        blurVideo.currentTime = main.currentTime;
      } catch {
        /* ignore */
      }
    }
  }, [background.mode, isTimelinePlaying, videoRef]);

  if (background.mode === 'none') return null;

  if (background.mode === 'color') {
    return (
      <div
        className="composition-bg composition-bg--color"
        style={{ ...rectStyle, backgroundColor: background.color ?? '#000000' }}
        aria-hidden
      />
    );
  }

  if (background.mode === 'blur') {
    const blurPx = blurLevelToPx(background.blurLevel);
    if (blurPx <= 0 || !sourceUrl) return null;
    return (
      <div className="composition-bg composition-bg--blur" style={rectStyle} aria-hidden>
        <video
          ref={blurVideoRef}
          className="composition-bg-blur-video"
          style={{ filter: `blur(${blurPx}px)` }}
          src={sourceUrl}
          muted
          playsInline
          preload="auto"
        />
      </div>
    );
  }

  if (background.mode === 'image') {
    const assetUrl =
      background.imageAssetId != null
        ? mediaAssets.find((item) => item.id === background.imageAssetId)?.url
        : null;
    const preset = findBackgroundImagePreset(background.imagePresetId);
    const gradient = preset?.gradient;
    const imageUrl = assetUrl ?? null;

    if (!imageUrl && !gradient) return null;

    return (
      <div
        className="composition-bg composition-bg--image"
        style={{
          ...rectStyle,
          ...(gradient && !imageUrl ? { background: gradient } : undefined),
        }}
        aria-hidden
      >
        {imageUrl ? <img src={imageUrl} alt="" className="composition-bg-image" /> : null}
      </div>
    );
  }

  return null;
}
