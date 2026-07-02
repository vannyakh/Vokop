import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getRedis } from '@vokop/db';
import type { VideoProbeResponse } from '@vokop/api';

const SESSION_PREFIX = 'vokop:session:';

export interface VideoSession {
  sessionId: string;
  filename: string;
  size: number;
  filePath: string;
  probe: VideoProbeResponse;
  createdAt: string;
  expiresAt: string;
}

export function sessionTtlSec(): number {
  return Number(process.env.SESSION_TTL_SEC ?? 86_400);
}

export function sessionsRoot(): string {
  return process.env.SESSIONS_DIR ?? path.join('/tmp', 'vokop-sessions');
}

export async function hashBuffer(buffer: Buffer): Promise<string> {
  const hash = createHash('sha256');
  hash.update(buffer.subarray(0, Math.min(buffer.length, 1024 * 1024)));
  hash.update(String(buffer.length));
  return hash.digest('hex').slice(0, 24);
}

export async function createVideoSession(
  file: Express.Multer.File,
  probe: VideoProbeResponse,
): Promise<VideoSession> {
  const sessionId = randomUUID();
  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'mp4';
  const dir = path.join(sessionsRoot(), sessionId);
  const filePath = path.join(dir, `source.${ext}`);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionTtlSec() * 1000);

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, file.buffer);

  const session: VideoSession = {
    sessionId,
    filename: file.originalname,
    size: file.size,
    filePath,
    probe,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await getRedis().setEx(
    `${SESSION_PREFIX}${sessionId}`,
    sessionTtlSec(),
    JSON.stringify(session),
  );

  return session;
}

export async function getVideoSession(sessionId: string): Promise<VideoSession | null> {
  const raw = await getRedis().get(`${SESSION_PREFIX}${sessionId}`);
  if (!raw) return null;
  return JSON.parse(raw) as VideoSession;
}

export async function deleteVideoSession(sessionId: string): Promise<void> {
  const session = await getVideoSession(sessionId);
  await getRedis().del(`${SESSION_PREFIX}${sessionId}`);
  if (session) {
    await rm(path.dirname(session.filePath), { recursive: true, force: true }).catch(() => undefined);
  }
}

export function sessionCacheKey(sessionId: string, type: string, extra = ''): string {
  return `vokop:cache:${sessionId}:${type}${extra ? `:${extra}` : ''}`;
}
