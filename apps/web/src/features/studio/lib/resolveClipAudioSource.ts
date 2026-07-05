import type { TimelineClipModel, MediaClip } from '@/features/studio/lib/timelineTypes';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import { audioBase64ToObjectUrl } from '@/lib/utils/audio';

export interface ClipAudioSource {
  key: string;
  url: string;
  mediaDuration: number;
}

const voiceBlobCache = new Map<string, string>();

function voiceBlobUrl(audioBase64: string): string {
  const cached = voiceBlobCache.get(audioBase64);
  if (cached) return cached;
  const url = audioBase64ToObjectUrl(audioBase64);
  voiceBlobCache.set(audioBase64, url);
  return url;
}

/** Resolve a playable URL + full media duration for timeline waveform decoding. */
export function resolveClipAudioSource(
  clip: TimelineClipModel,
  ctx: {
    videoUrl: string | null;
    audioBase64: string | null;
    mediaAssets: MediaAsset[];
    audioClips: MediaClip[];
    videoClips: MediaClip[];
    mediaDuration: number;
    duration: number;
  },
): ClipAudioSource | null {
  const storedClip = ctx.audioClips.find((c) => c.id === clip.id);

  if (storedClip?.mediaAssetId) {
    const asset = ctx.mediaAssets.find((a) => a.id === storedClip.mediaAssetId);
    if (asset?.url) {
      return {
        key: `asset:${asset.id}`,
        url: asset.url,
        mediaDuration: Math.max(asset.duration || 0, (clip.sourceStart ?? 0) + clip.duration),
      };
    }
  }

  if (storedClip?.linkedVideoClipId) {
    const videoClip = ctx.videoClips.find((v) => v.id === storedClip.linkedVideoClipId);
    if (videoClip?.mediaAssetId) {
      const asset = ctx.mediaAssets.find((a) => a.id === videoClip.mediaAssetId);
      if (asset?.url) {
        return {
          key: `asset:${asset.id}`,
          url: asset.url,
          mediaDuration: Math.max(asset.duration || ctx.mediaDuration, clip.duration),
        };
      }
    }
    if (ctx.videoUrl) {
      return {
        key: `video:${ctx.videoUrl}`,
        url: ctx.videoUrl,
        mediaDuration: Math.max(ctx.mediaDuration, clip.duration),
      };
    }
  }

  const namedAsset = ctx.mediaAssets.find(
    (a) => a.kind === 'audio' && (a.name === clip.name || clip.name.includes(a.name)),
  );
  if (namedAsset?.url) {
    return {
      key: `asset:${namedAsset.id}`,
      url: namedAsset.url,
      mediaDuration: Math.max(namedAsset.duration || 0, clip.duration),
    };
  }

  if (ctx.audioBase64 && (clip.id === 'audio-main' || clip.mediaKind === 'audio')) {
    return {
      key: `voice:${ctx.audioBase64.slice(0, 48)}`,
      url: voiceBlobUrl(ctx.audioBase64),
      mediaDuration: Math.max(ctx.duration, clip.duration),
    };
  }

  if (ctx.videoUrl) {
    return {
      key: `video:${ctx.videoUrl}`,
      url: ctx.videoUrl,
      mediaDuration: Math.max(ctx.mediaDuration, clip.duration),
    };
  }

  return null;
}
