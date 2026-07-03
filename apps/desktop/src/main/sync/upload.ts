/**
 * Resumable upload to Cloudflare R2 via presigned S3 multipart.
 * Persists upload_offset in the assets table so uploads survive restarts.
 */

import { createReadStream, statSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { updateAsset, getAsset } from '../local-db/assets.js';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB — S3 minimum part size

export interface UploadConfig {
  /** Presigned multipart upload URL (obtained via /api/v1/assets/presign) */
  uploadUrl: string;
  uploadId: string;
  assetId: string;
  localPath: string;
  contentType: string;
}

export interface UploadResult {
  r2Key: string;
}

/**
 * Resumable multipart upload.
 * Stores progress via upload_offset in the DB; retries from last offset on failure.
 */
export async function resumableUpload(
  db: DatabaseSync,
  config: UploadConfig,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const { uploadUrl, uploadId, assetId, localPath, contentType } = config;

  const fileSize = statSync(localPath).size;
  const asset = getAsset(db, assetId);
  let offset = asset?.uploadOffset ?? 0;
  const partUrls: string[] = []; // populated by the server via presign API

  // Simple single-part PUT fallback (< CHUNK_SIZE)
  if (fileSize <= CHUNK_SIZE) {
    const { readFile } = await import('node:fs/promises');
    const buffer = await readFile(localPath);
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: buffer,
      headers: { 'Content-Type': contentType, 'Content-Length': String(fileSize) },
    });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    updateAsset(db, assetId, { uploadOffset: fileSize });
    onProgress?.(100);
    return { r2Key: new URL(uploadUrl).pathname.slice(1) };
  }

  // Multipart upload (chunked)
  const parts: { PartNumber: number; ETag: string }[] = [];
  const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
  const stream = createReadStream(localPath, { start: offset });

  let partNumber = Math.floor(offset / CHUNK_SIZE) + 1;
  const chunks: Buffer[] = [];
  let chunkSize = 0;

  for await (const data of stream) {
    chunks.push(data as Buffer);
    chunkSize += (data as Buffer).length;

    if (chunkSize >= CHUNK_SIZE) {
      const chunk = Buffer.concat(chunks);
      chunks.length = 0;
      chunkSize = 0;

      // Upload chunk to part URL (partUrls must be pre-fetched from server)
      const partUrl = partUrls[partNumber - 1];
      if (!partUrl) throw new Error(`No presigned URL for part ${partNumber}`);

      const res = await fetch(partUrl, {
        method: 'PUT',
        body: chunk,
        headers: { 'Content-Length': String(chunk.length) },
      });
      if (!res.ok) throw new Error(`Part ${partNumber} upload failed: ${res.status}`);

      const etag = res.headers.get('ETag') ?? '';
      parts.push({ PartNumber: partNumber, ETag: etag });

      offset += chunk.length;
      updateAsset(db, assetId, { uploadOffset: offset });
      onProgress?.(Math.round((partNumber / totalParts) * 100));
      partNumber++;
    }
  }

  // Upload last chunk
  if (chunks.length > 0) {
    const chunk = Buffer.concat(chunks);
    const partUrl = partUrls[partNumber - 1];
    if (!partUrl) throw new Error(`No presigned URL for final part ${partNumber}`);
    const res = await fetch(partUrl, { method: 'PUT', body: chunk });
    if (!res.ok) throw new Error(`Final part upload failed: ${res.status}`);
    parts.push({ PartNumber: partNumber, ETag: res.headers.get('ETag') ?? '' });
  }

  onProgress?.(100);
  return { r2Key: new URL(uploadUrl).pathname.slice(1) };
}
