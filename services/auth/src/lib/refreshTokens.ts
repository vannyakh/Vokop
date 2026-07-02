import { randomUUID } from 'node:crypto';
import { getRedis } from '@vokop/db';
import { AUTH_CONFIG } from '../config.js';
import { signRefreshToken, verifyRefreshToken } from './jwt.js';

const PREFIX = 'vokop:auth:refresh:';

export async function issueRefreshToken(userId: string): Promise<string> {
  const tokenId = randomUUID();
  const redis = getRedis();
  await redis.setEx(
    `${PREFIX}${tokenId}`,
    AUTH_CONFIG.refreshTtlSec,
    JSON.stringify({ userId, family: tokenId }),
  );
  return signRefreshToken(userId, tokenId);
}

export async function rotateRefreshToken(refreshToken: string): Promise<{ userId: string; token: string }> {
  const payload = verifyRefreshToken(refreshToken);
  const redis = getRedis();
  const key = `${PREFIX}${payload.tid}`;
  const stored = await redis.get(key);
  if (!stored) throw new Error('Refresh token revoked or expired');

  const parsed = JSON.parse(stored) as { userId: string };
  if (parsed.userId !== payload.sub) throw new Error('Refresh token mismatch');

  await redis.del(key);
  const next = await issueRefreshToken(parsed.userId);
  return { userId: parsed.userId, token: next };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const redis = getRedis();
    await redis.del(`${PREFIX}${payload.tid}`);
  } catch {
    // ignore invalid tokens on logout
  }
}
