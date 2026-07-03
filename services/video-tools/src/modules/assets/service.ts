import { randomUUID } from 'node:crypto';
import { assets as assetsCol } from '../../db/collections.js';
import type { AssetDoc, AssetKind } from '../../db/collections.js';
import { assetKey, presignPut, isR2Configured } from '../../storage/r2.js';
import { getIngestQueue } from '../../queue/queues.js';

export interface PresignResult {
  assetId: string;
  uploadUrl: string;
  r2Key: string;
  expiresIn: number;
}

const MIME_TO_KIND: Record<string, AssetKind> = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/avi': 'video',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
};

function inferKind(contentType: string, filename: string): AssetKind {
  if (MIME_TO_KIND[contentType]) return MIME_TO_KIND[contentType];
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'aac', 'ogg', 'wav', 'flac'].includes(ext)) return 'audio';
  return 'image';
}

export async function presignAssetUpload(
  ownerId: string,
  projectId: string,
  filename: string,
  contentType: string,
  size: number,
  expiresIn = 3600,
): Promise<PresignResult> {
  if (!isR2Configured()) throw Object.assign(new Error('R2 storage not configured'), { statusCode: 503 });

  const assetId = randomUUID();
  const kind = inferKind(contentType, filename);
  const r2Key = assetKey(ownerId, assetId, filename);

  const now = new Date();
  const doc: AssetDoc = {
    assetId,
    projectId,
    ownerId,
    kind,
    filename,
    size,
    status: 'pending',
    r2Key,
    createdAt: now,
    updatedAt: now,
  };
  await assetsCol().insertOne(doc);

  const uploadUrl = await presignPut(r2Key, contentType, expiresIn);
  return { assetId, uploadUrl, r2Key, expiresIn };
}

export async function completeAssetUpload(
  assetId: string,
  ownerId: string,
): Promise<AssetDoc> {
  const asset = await assetsCol().findOne({ assetId, ownerId });
  if (!asset) throw Object.assign(new Error('Asset not found'), { statusCode: 404 });
  if (asset.status !== 'pending') throw Object.assign(new Error('Asset already processed'), { statusCode: 409 });

  await assetsCol().updateOne({ assetId }, { $set: { status: 'ingesting', updatedAt: new Date() } });

  // Enqueue ingest job
  await getIngestQueue().add('ingest', {
    assetId,
    projectId: asset.projectId,
    ownerId: asset.ownerId,
    r2Key: asset.r2Key!,
    filename: asset.filename,
    kind: asset.kind,
    size: asset.size,
  });

  return { ...asset, status: 'ingesting' };
}

export async function listAssets(ownerId: string, projectId?: string): Promise<AssetDoc[]> {
  const filter = projectId ? { ownerId, projectId } : { ownerId };
  return assetsCol().find(filter, { sort: { createdAt: -1 } }).toArray();
}

export async function getAsset(assetId: string, ownerId: string): Promise<AssetDoc | null> {
  return assetsCol().findOne({ assetId, ownerId });
}
