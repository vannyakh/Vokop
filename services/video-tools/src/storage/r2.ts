/**
 * Cloudflare R2 storage client (S3-compatible via @aws-sdk/client-s3).
 * Falls back gracefully when R2 env vars are not configured (local dev / tests).
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

function buildS3Client(): S3Client | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = config;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

let _client: S3Client | null | undefined = undefined;

function getClient(): S3Client {
  if (_client === undefined) _client = buildS3Client();
  if (!_client) throw new Error('R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
  return _client;
}

export function isR2Configured(): boolean {
  return Boolean(config.R2_ACCOUNT_ID && config.R2_ACCESS_KEY_ID && config.R2_SECRET_ACCESS_KEY && config.R2_BUCKET);
}

function bucket(): string {
  if (!config.R2_BUCKET) throw new Error('R2_BUCKET not configured');
  return config.R2_BUCKET;
}

/** Generate a presigned PUT URL for direct browser → R2 upload (default 1 hour). */
export async function presignPut(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

/** Generate a presigned GET URL for temporary download (default 1 hour). */
export async function presignGet(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

/** Get an R2 object as a Buffer. */
export async function getObject(key: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key });
  const response = await getClient().send(cmd);
  const body = response.Body;
  if (!body) throw new Error(`R2 object ${key} has no body`);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Upload a Buffer or file to R2. */
export async function putObject(key: string, body: Buffer | Uint8Array, contentType = 'application/octet-stream'): Promise<void> {
  const cmd = new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType });
  await getClient().send(cmd);
}

/** Delete an R2 object. */
export async function deleteObject(key: string): Promise<void> {
  const cmd = new DeleteObjectCommand({ Bucket: bucket(), Key: key });
  await getClient().send(cmd);
}

/**
 * Resolve a public CDN URL for an R2 object.
 * Uses R2_PUBLIC_URL env when set, otherwise falls back to a presigned GET URL.
 */
export async function publicUrl(key: string): Promise<string> {
  if (config.R2_PUBLIC_URL) {
    return `${config.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }
  return presignGet(key, 86_400);
}

/** Generate a deterministic R2 key for an asset. */
export function assetKey(ownerId: string, assetId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
  return `assets/${ownerId}/${assetId}.${ext}`;
}

/** Generate an R2 key for a render output. */
export function renderOutputKey(ownerId: string, jobId: string, format: string): string {
  return `exports/${ownerId}/${jobId}.${format}`;
}
