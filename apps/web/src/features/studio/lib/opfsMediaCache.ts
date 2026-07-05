import { file, write, dir } from 'opfs-tools';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';

const ROOT = '/vokop-media/projects';

export type OpfsMediaManifestEntry = Omit<MediaAsset, 'url'> & {
  fileName: string;
};

interface OpfsManifest {
  version: 1;
  assets: OpfsMediaManifestEntry[];
}

function projectRoot(projectId: string): string {
  return `${ROOT}/${projectId}`;
}

function manifestPath(projectId: string): string {
  return `${projectRoot(projectId)}/manifest.json`;
}

function assetPath(projectId: string, id: string, fileName: string): string {
  return `${projectRoot(projectId)}/${id}/${fileName}`;
}

async function readManifest(projectId: string): Promise<OpfsManifest> {
  const path = manifestPath(projectId);
  try {
    if (!(await file(path).exists())) return { version: 1, assets: [] };
    const text = await file(path, 'r').text();
    const parsed = JSON.parse(text) as OpfsManifest;
    if (!parsed?.assets || !Array.isArray(parsed.assets)) return { version: 1, assets: [] };
    return { version: 1, assets: parsed.assets };
  } catch {
    return { version: 1, assets: [] };
  }
}

async function writeManifest(projectId: string, manifest: OpfsManifest): Promise<void> {
  await write(manifestPath(projectId), JSON.stringify(manifest), { overwrite: true });
}

/** Persist a media file in OPFS for a project and update its manifest. */
export async function persistMediaToOpfs(
  projectId: string,
  asset: MediaAsset,
  blob: File | Blob,
  fileName?: string,
): Promise<void> {
  if (!projectId) return;

  const name = fileName ?? (blob instanceof File ? blob.name : `${asset.id}.bin`);
  const path = assetPath(projectId, asset.id, name);
  const buffer = await blob.arrayBuffer();
  await write(path, buffer, { overwrite: true });

  const manifest = await readManifest(projectId);
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
  await writeManifest(projectId, { version: 1, assets: next });
}

/** Load a File from OPFS for a project media asset id. */
export async function loadMediaFileFromOpfs(projectId: string, id: string): Promise<File | null> {
  const manifest = await readManifest(projectId);
  const entry = manifest.assets.find((item) => item.id === id);
  if (!entry) return null;
  const path = assetPath(projectId, id, entry.fileName);
  if (!(await file(path).exists())) return null;
  const buffer = await file(path, 'r').arrayBuffer();
  return new File([buffer], entry.fileName, { type: entry.mimeType });
}

/** Remove an asset from a project's OPFS cache (file + manifest entry). */
export async function removeMediaFromOpfs(projectId: string, id: string): Promise<void> {
  if (!projectId) return;

  const manifest = await readManifest(projectId);
  const entry = manifest.assets.find((item) => item.id === id);
  if (entry) {
    const path = assetPath(projectId, id, entry.fileName);
    try {
      if (await file(path).exists()) await file(path).remove();
    } catch {
      // ignore missing file
    }
  }
  await writeManifest(projectId, {
    version: 1,
    assets: manifest.assets.filter((item) => item.id !== id),
  });
}

/**
 * Restore media assets from OPFS for a project (survives page reload).
 * Returns assets with fresh blob: URLs and registers Files in the in-memory map via callback.
 */
export async function hydrateMediaFromOpfs(
  projectId: string,
  registerFile: (id: string, file: File) => void,
): Promise<MediaAsset[]> {
  if (!projectId) return [];

  const manifest = await readManifest(projectId);
  const assets: MediaAsset[] = [];

  for (const entry of manifest.assets) {
    try {
      const path = assetPath(projectId, entry.id, entry.fileName);
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

/** Best-effort clear of a project's media cache directory. */
export async function clearOpfsMediaCache(projectId: string): Promise<void> {
  if (!projectId) return;
  try {
    const root = projectRoot(projectId);
    if (await dir(root).exists()) await dir(root).remove();
  } catch {
    // ignore
  }
}
