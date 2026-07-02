import { AUTH_CONFIG } from '../config.js';
import { signAccessToken } from '../lib/jwt.js';
import { mapUser } from '../lib/mappers.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { issueRefreshToken, revokeRefreshToken, rotateRefreshToken } from '../lib/refreshTokens.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  resolvePermissions,
} from '../db/users.js';
import { findRoleBySlug } from '../db/roles.js';

async function buildSession(userId: string) {
  const user = await findUserById(userId);
  if (!user || user.kind === 'guest') throw new Error('User not found');
  if (user.status !== 'active') throw new Error('Account disabled');

  const permissions = await resolvePermissions(user.roleIds);
  const roleIds = user.roleIds.map((id) => id.toString());
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    kind: user.kind,
    permissions,
  });
  const refreshToken = await issueRefreshToken(user._id.toString());

  return {
    user: mapUser(user, permissions, roleIds),
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: AUTH_CONFIG.accessTtlSec,
    },
  };
}

export async function registerUser(email: string, password: string, name: string) {
  const existing = await findUserByEmail(email);
  if (existing) throw new Error('Email already registered');

  const userRole = await findRoleBySlug('user');
  if (!userRole) throw new Error('Default user role missing');

  const user = await createUser({
    email,
    name,
    passwordHash: await hashPassword(password),
    kind: 'user',
    status: 'active',
    roleIds: [userRole._id],
  });

  return buildSession(user._id.toString());
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) throw new Error('Invalid credentials');
  if (user.kind === 'guest') throw new Error('Invalid credentials');
  if (user.status !== 'active') throw new Error('Account disabled');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');

  return buildSession(user._id.toString());
}

export async function refreshUserSession(refreshToken: string) {
  const { userId, token } = await rotateRefreshToken(refreshToken);
  const session = await buildSession(userId);
  return { ...session, tokens: { ...session.tokens, refreshToken: token } };
}

export async function logoutUser(refreshToken: string) {
  await revokeRefreshToken(refreshToken);
}

export async function getUserProfile(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found');
  const permissions = await resolvePermissions(user.roleIds);
  return mapUser(
    user,
    permissions,
    user.roleIds.map((id) => id.toString()),
  );
}

export async function lookupEmail(email: string): Promise<{ exists: boolean }> {
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user || user.kind === 'guest') return { exists: false };
  return { exists: true };
}
