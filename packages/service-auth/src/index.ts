export { SERVICE_AUTH_CONFIG } from './config.js';
export { verifyAccessToken, type AccessTokenPayload } from './jwt.js';
export {
  authenticate,
  requirePermission,
  type AuthedRequest,
} from './middleware.js';
export { findUserById, resolvePermissions, usersCol, rolesCol, USERS, ROLES } from './users.js';
export type { UserDoc, RoleDoc } from './types.js';
