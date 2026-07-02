import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config.js';
import type { PermissionSlug } from '@vokop/shared';

export interface AccessTokenPayload {
  sub: string;
  kind: string;
  permissions: PermissionSlug[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, AUTH_CONFIG.accessSecret, {
    expiresIn: AUTH_CONFIG.accessTtlSec,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, AUTH_CONFIG.accessSecret) as AccessTokenPayload;
}

export function signRefreshToken(userId: string, tokenId: string): string {
  return jwt.sign({ sub: userId, tid: tokenId }, AUTH_CONFIG.refreshSecret, {
    expiresIn: AUTH_CONFIG.refreshTtlSec,
  });
}

export function verifyRefreshToken(token: string): { sub: string; tid: string } {
  return jwt.verify(token, AUTH_CONFIG.refreshSecret) as { sub: string; tid: string };
}
