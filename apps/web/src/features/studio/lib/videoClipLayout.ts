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

  return {
    x: clip.x ?? contentRect.x,
    y: clip.y ?? contentRect.y,
    width: clip.width ?? contentRect.width,
    height: clip.height ?? contentRect.height,
    rotation: clip.rotation ?? 0,
    opacity: clip.opacity ?? 1,
  };
}
