import { file, write, dir } from 'opfs-tools';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';

const ROOT = '/vokop-media';
const MANIFEST = `${ROOT}/manifest.json`;

export type OpfsMediaManifestEntry = Omit<MediaAsset, 'url'> & {
  fileName: string;
};

interface OpfsManifest {
  version: 1;
  assets: OpfsMediaManifestEntry[];
}

function assetPath(id: string, fileName: string): string {
  return `${ROOT}/${id}/${fileName}`;
}

async function readManifest(): Promise<OpfsManifest> {
  try {
    if (!(await file(MANIFEST).exists())) return { version: 1, assets: [] };
    const text = await file(MANIFEST, 'r').text();
    const parsed = JSON.parse(text) as OpfsManifest;
    if (!parsed?.assets || !Array.isArray(parsed.assets)) return { version: 1, assets: [] };
    return { version: 1, assets: parsed.assets };
  } catch {
    return { version: 1, assets: [] };
  }
}

async function writeManifest(manifest: OpfsManifest): Promise<void> {
  await write(MANIFEST, JSON.stringify(manifest), { overwrite: true });
}

/** Persist a media file in OPFS and update the manifest. */
export async function persistMediaToOpfs(
  asset: MediaAsset,
  blob: File | Blob,
  fileName?: string,
): Promise<void> {
  const name = fileName ?? (blob instanceof File ? blob.name : `${asset.id}.bin`);
  const path = assetPath(asset.id, name);
  const buffer = await blob.arrayBuffer();
  await write(path, buffer, { overwrite: true });

  const manifest = await readManifest();
  const entry: OpfsMediaManifestEntry = {
    id: asset.id,
    kind: asset.kind,
    name: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    isPrimary: asset.isPrimary,
    fileName: name,
  };
  const next = manifest.assets.filter((item) => item.id !== asset.id);
  next.push(entry);
  await writeManifest({ version: 1, assets: next });
}

/** Load a File from OPFS for a media asset id. */
export async function loadMediaFileFromOpfs(id: string): Promise<File | null> {
  const manifest = await readManifest();
  const entry = manifest.assets.find((item) => item.id === id);
  if (!entry) return null;
  const path = assetPath(id, entry.fileName);
  if (!(await file(path).exists())) return null;
  const buffer = await file(path, 'r').arrayBuffer();
  return new File([buffer], entry.fileName, { type: entry.mimeType });
}

/** Remove an asset from OPFS (file + manifest entry). */
export async function removeMediaFromOpfs(id: string): Promise<void> {
  const manifest = await readManifest();
  const entry = manifest.assets.find((item) => item.id === id);
  if (entry) {
    const path = assetPath(id, entry.fileName);
    try {
      if (await file(path).exists()) await file(path).remove();
    } catch {
      // ignore missing file
    }
  }
  await writeManifest({
    version: 1,
    assets: manifest.assets.filter((item) => item.id !== id),
  });
}

/**
 * Restore media assets from OPFS (survives page reload).
 * Returns assets with fresh blob: URLs and registers Files in the in-memory map via callback.
 */
export async function hydrateMediaFromOpfs(
  registerFile: (id: string, file: File) => void,
): Promise<MediaAsset[]> {
  const manifest = await readManifest();
  const assets: MediaAsset[] = [];

  for (const entry of manifest.assets) {
    try {
      const path = assetPath(entry.id, entry.fileName);
      if (!(await file(path).exists())) continue;
      const buffer = await file(path, 'r').arrayBuffer();
      const mediaFile = new File([buffer], entry.fileName, { type: entry.mimeType });
      registerFile(entry.id, mediaFile);
      assets.push({
        id: entry.id,
        kind: entry.kind,
        name: entry.name,
        mimeType: entry.mimeType,
        size: entry.size,
        duration: entry.duration,
        width: entry.width,
        height: entry.height,
        isPrimary: entry.isPrimary,
        url: URL.createObjectURL(mediaFile),
      });
    } catch {
      // skip corrupt entries
    }
  }

  return assets;
}

/** Best-effort clear of the media cache directory. */
export async function clearOpfsMediaCache(): Promise<void> {
  try {
    if (await dir(ROOT).exists()) await dir(ROOT).remove();
  } catch {
    // ignore
  }
}
