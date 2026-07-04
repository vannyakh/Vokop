import jwt from 'jsonwebtoken';
import type { PermissionSlug } from '@vokop/shared';
import { SERVICE_AUTH_CONFIG } from './config.js';

export interface AccessTokenPayload {
  sub: string;
  kind: string;
  permissions: PermissionSlug[];
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, SERVICE_AUTH_CONFIG.accessSecret) as AccessTokenPayload;
}
