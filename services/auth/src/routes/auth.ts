import { Router } from 'express';
import {
  authSessionResponseSchema,
  emailLookupRequestSchema,
  emailLookupResponseSchema,
  loginRequestSchema,
  meResponseSchema,
  refreshRequestSchema,
  registerRequestSchema,
  toApiResponse,
} from '@vokop/api';
import {
  getUserProfile,
  loginUser,
  lookupEmail,
  logoutUser,
  refreshUserSession,
  registerUser,
} from '../services/authService.js';
import { authenticate, type AuthedRequest } from '../middleware/auth.js';

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = registerRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid registration payload' });
      return;
    }

    try {
      const session = await registerUser(parsed.data.email, parsed.data.password, parsed.data.name);
      res.status(201).json(toApiResponse(authSessionResponseSchema, session));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed' });
    }
  });

  router.post('/lookup', async (req, res) => {
    const parsed = emailLookupRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email' });
      return;
    }

    try {
      const result = await lookupEmail(parsed.data.email);
      res.json(toApiResponse(emailLookupResponseSchema, result));
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Lookup failed' });
    }
  });

  router.post('/login', async (req, res) => {
    const parsed = loginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid login payload' });
      return;
    }

    try {
      const session = await loginUser(parsed.data.email, parsed.data.password);
      res.json(toApiResponse(authSessionResponseSchema, session));
    } catch {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  router.post('/refresh', async (req, res) => {
    const parsed = refreshRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid refresh payload' });
      return;
    }

    try {
      const session = await refreshUserSession(parsed.data.refreshToken);
      res.json(toApiResponse(authSessionResponseSchema, session));
    } catch {
      res.status(401).json({ error: 'Refresh token invalid' });
    }
  });

  router.post('/logout', async (req, res) => {
    const parsed = refreshRequestSchema.safeParse(req.body);
    if (parsed.success) await logoutUser(parsed.data.refreshToken);
    res.json({ ok: true as const });
  });

  router.get('/me', authenticate, async (req: AuthedRequest, res) => {
    try {
      const user = await getUserProfile(req.auth!.userId);
      res.json(toApiResponse(meResponseSchema, { user }));
    } catch {
      res.status(404).json({ error: 'User not found' });
    }
  });

  return router;
}
