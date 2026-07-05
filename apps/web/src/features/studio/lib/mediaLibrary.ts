export type MediaAssetKind = 'video' | 'audio' | 'image';

export interface MediaAsset {
  id: string;
  kind: MediaAssetKind;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  duration: number;
  width?: number;
  height?: number;
  /** Project’s active video source. */
  isPrimary?: boolean;
}

/** Serializable media metadata stored on the project record (no blob URLs). */
export type PersistedMediaAsset = Omit<MediaAsset, 'url'>;

export function toPersistedMediaAsset(asset: MediaAsset): PersistedMediaAsset {
  const { url: _url, ...rest } = asset;
  return rest;
}

export function mergePersistedMediaAssets(
  hydrated: MediaAsset[],
  persisted: PersistedMediaAsset[] | undefined,
): MediaAsset[] {
  if (!persisted?.length) return hydrated;

  const persistedById = new Map(persisted.map((asset) => [asset.id, asset]));
  const merged = hydrated.map((asset) => {
    const saved = persistedById.get(asset.id);
    return saved ? { ...asset, ...saved, url: asset.url } : asset;
  });

  for (const saved of persisted) {
    if (!merged.some((asset) => asset.id === saved.id)) {
      merged.push({ ...saved, url: '' });
    }
  }

  return merged;
}

export const MEDIA_ASSET_DRAG_MIME = 'application/x-vokop-media-asset';

const mediaFileMap = new Map<string, File>();

export function storeMediaFile(id: string, file: File): void {
  mediaFileMap.set(id, file);
}

export function getMediaFile(id: string): File | undefined {
  return mediaFileMap.get(id);
}

export function forgetMediaFile(id: string): void {
  mediaFileMap.delete(id);
}

export function kindFromFile(file: File): MediaAssetKind | null {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  const name = file.name.toLowerCase();
  if (/\.(mp4|webm|mov|mkv|m4v)$/.test(name)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac)$/.test(name)) return 'audio';
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(name)) return 'image';
  return null;
}

export function probeMediaMeta(
  file: File,
  url: string,
): Promise<{ duration: number; width?: number; height?: number }> {
  const kind = kindFromFile(file);
  if (kind === 'image') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ duration: 4, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ duration: 4 });
      img.src = url;
    });
  }

  if (kind === 'video') {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          width: video.videoWidth || undefined,
          height: video.videoHeight || undefined,
        });
        video.removeAttribute('src');
        video.load();
      };
      video.onerror = () => resolve({ duration: 0 });
      video.src = url;
    });
  }

  if (kind === 'audio') {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        resolve({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 });
        audio.removeAttribute('src');
        audio.load();
      };
      audio.onerror = () => resolve({ duration: 0 });
      audio.src = url;
    });
  }

  return Promise.resolve({ duration: 0 });
}

export function mediaAssetDragPayload(assetId: string, kind?: MediaAssetKind): string {
  return JSON.stringify({ assetId, kind });
}

export function parseMediaAssetDrag(data: string): { assetId: string; kind?: MediaAssetKind } | null {
  try {
    const parsed = JSON.parse(data) as { assetId?: string; kind?: MediaAssetKind };
    if (!parsed.assetId) return null;
    return { assetId: parsed.assetId, kind: parsed.kind };
  } catch {
    return null;
  }
}
