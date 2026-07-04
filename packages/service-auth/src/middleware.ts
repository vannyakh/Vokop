import type { NextFunction, Request, Response } from 'express';
import type { PermissionSlug } from '@vokop/shared';
import { verifyAccessToken } from './jwt.js';
import { findUserById, resolvePermissions } from './users.js';

export interface AuthedRequest extends Request {
  auth?: {
    userId: string;
    permissions: PermissionSlug[];
    kind: string;
  };
}

export async function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing access token' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);
    if (!user || user.status !== 'active' || user.kind === 'guest') {
      res.status(401).json({ error: 'User inactive or not found' });
      return;
    }

    const permissions = await resolvePermissions(user.roleIds);
    req.auth = { userId: user._id.toString(), permissions, kind: user.kind };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid access token' });
  }
}

export function requirePermission(...required: PermissionSlug[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const allowed = required.every((perm) => req.auth!.permissions.includes(perm));
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}
