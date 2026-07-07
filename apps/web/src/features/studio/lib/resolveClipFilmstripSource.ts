import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import { getMediaFile } from '@/features/studio/lib/mediaLibrary';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import { resolveClipVideoSource } from '@/features/studio/lib/export/resolveClipVideoSource';

export interface ClipFilmstripSource {
  key: string;
  file: File | null;
  duration: number;
  /** Server session — only set for the primary uploaded video. */
  sessionId: string | null;
}

export function resolveClipFilmstripSource(
  clip: MediaClip,
  ctx: {
    videoFile: File | null;
    videoUrl: string | null;
    mediaAssets: MediaAsset[];
    mediaDuration: number;
    videoSessionId: string | null;
  },
): ClipFilmstripSource | null {
  const videoSource = resolveClipVideoSource(clip, {
    videoUrl: ctx.videoUrl,
    mediaAssets: ctx.mediaAssets,
  });
  if (!videoSource) return null;

  if (clip.mediaAssetId) {
    const asset = ctx.mediaAssets.find((item) => item.id === clip.mediaAssetId);
    if (!asset) return null;
    return {
      key: videoSource.key,
      file: getMediaFile(asset.id) ?? null,
      duration: Math.max(asset.duration || 0, clip.sourceStart + clip.duration),
      sessionId: null,
    };
  }

  if (!ctx.videoFile || !ctx.videoUrl) return null;

  return {
    key: videoSource.key,
    file: ctx.videoFile,
    duration: Math.max(ctx.mediaDuration, clip.sourceStart + clip.duration),
    sessionId: ctx.videoSessionId,
  };
}

/** Unique filmstrip sources referenced by timeline video clips. */
export function collectFilmstripSources(
  clips: MediaClip[],
  ctx: {
    videoFile: File | null;
    videoUrl: string | null;
    mediaAssets: MediaAsset[];
    mediaDuration: number;
    videoSessionId: string | null;
  },
): ClipFilmstripSource[] {
  const seen = new Set<string>();
  const sources: ClipFilmstripSource[] = [];

  for (const clip of clips) {
    const source = resolveClipFilmstripSource(clip, ctx);
    if (!source || seen.has(source.key)) continue;
    seen.add(source.key);
    sources.push(source);
  }

  return sources;
}
