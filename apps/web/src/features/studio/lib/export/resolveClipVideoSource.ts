import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

export interface ClipVideoSource {
  key: string;
  url: string;
}

/** Resolve a playable video URL for a timeline clip (session upload or media library asset). */
export function resolveClipVideoSource(
  clip: MediaClip,
  ctx: { videoUrl: string | null; mediaAssets: MediaAsset[] },
): ClipVideoSource | null {
  if (clip.mediaAssetId) {
    const asset = ctx.mediaAssets.find((item) => item.id === clip.mediaAssetId);
    if (asset?.url) {
      return { key: `asset:${asset.id}`, url: asset.url };
    }
  }

  if (ctx.videoUrl) {
    return { key: `video:${ctx.videoUrl}`, url: ctx.videoUrl };
  }

  return null;
}

/** Collect unique video sources referenced by timeline clips. */
export function collectClipVideoSources(
  clips: MediaClip[],
  ctx: { videoUrl: string | null; mediaAssets: MediaAsset[] },
): ClipVideoSource[] {
  const seen = new Set<string>();
  const sources: ClipVideoSource[] = [];
  for (const clip of clips) {
    const source = resolveClipVideoSource(clip, ctx);
    if (!source || seen.has(source.key)) continue;
    seen.add(source.key);
    sources.push(source);
  }
  return sources;
}
