import { computeFadeEnvelope } from '@/features/studio/lib/audioClipMix';
import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

export const VIDEO_PROXY_ID_PREFIX = 'video-proxy-';

export function videoProxyId(clipId: string): string {
  return `${VIDEO_PROXY_ID_PREFIX}${clipId}`;
}

export function isVideoProxyId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith(VIDEO_PROXY_ID_PREFIX));
}

export interface VideoClipLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

/** Map a media clip to its composition box inside the preview frame. */
export function resolveVideoClipLayout(
  clip: MediaClip | null | undefined,
  contentRect: CanvasRect,
  currentTime?: number,
): VideoClipLayout {
  if (!clip || contentRect.width <= 0 || contentRect.height <= 0) {
    return {
      x: contentRect.x,
      y: contentRect.y,
      width: Math.max(1, contentRect.width),
      height: Math.max(1, contentRect.height),
      rotation: 0,
      opacity: 1,
    };
  }

  const baseOpacity = clip.opacity ?? 1;
  const fadeEnvelope =
    currentTime == null
      ? 1
      : computeFadeEnvelope(
          currentTime,
          clip.start,
          clip.duration,
          clip.videoFadeInSec ?? 0,
          clip.videoFadeOutSec ?? 0,
        );

  return {
    // clip.x/y/width/height are fractions (0..1) of contentRect — resolved to
    // live on-screen px here, at render time, so resizing never rewrites the store.
    x: clip.x != null ? contentRect.x + clip.x * contentRect.width : contentRect.x,
    y: clip.y != null ? contentRect.y + clip.y * contentRect.height : contentRect.y,
    width: clip.width != null ? clip.width * contentRect.width : contentRect.width,
    height: clip.height != null ? clip.height * contentRect.height : contentRect.height,
    rotation: clip.rotation ?? 0,
    opacity: baseOpacity * fadeEnvelope,
  };
}

/** Read live box from Konva proxy while dragging / resizing (scale baked into width/height). */
export function layoutFromKonvaVideoNode(
  node: {
    x: () => number;
    y: () => number;
    scaleX: () => number;
    scaleY: () => number;
    rotation: () => number;
  },
  base: Pick<VideoClipLayout, 'width' | 'height' | 'opacity'>,
): VideoClipLayout {
  return {
    x: node.x(),
    y: node.y(),
    width: Math.max(48, base.width * Math.abs(node.scaleX())),
    height: Math.max(48, base.height * Math.abs(node.scaleY())),
    rotation: node.rotation(),
    opacity: base.opacity,
  };
}
