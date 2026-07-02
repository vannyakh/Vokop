import { z } from 'zod';

export const permissionSlugSchema = z.enum([
  'admin.access',
  'users.read',
  'users.write',
  'roles.read',
  'roles.write',
  'menus.read',
  'menus.write',
]);

export const userKindSchema = z.enum(['user', 'admin', 'guest']);
export const userStatusSchema = z.enum(['active', 'disabled', 'pending']);

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  kind: userKindSchema,
  status: userStatusSchema,
  roleIds: z.array(z.string()),
  permissions: z.array(permissionSlugSchema),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const emailLookupRequestSchema = z.object({
  email: z.string().email(),
});

export const emailLookupResponseSchema = z.object({
  exists: z.boolean(),
});

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
});

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(10),
});

export const authSessionResponseSchema = z.object({
  user: authUserSchema,
  tokens: authTokensSchema,
});

export const meResponseSchema = z.object({
  user: authUserSchema,
});

export const roleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  description: z.string().optional(),
  permissions: z.array(permissionSlugSchema),
  isSystem: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const permissionSchema = z.object({
  slug: permissionSlugSchema,
  label: z.string(),
  description: z.string().optional(),
  group: z.enum(['admin', 'users', 'roles', 'menus']),
});

export const adminMenuSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  icon: z.string().optional(),
  parentId: z.string().nullable(),
  order: z.number(),
  permission: permissionSlugSchema.nullable(),
  visible: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminMenuTreeItemSchema: z.ZodType<{
  id: string;
  label: string;
  path: string;
  icon?: string;
  parentId: string | null;
  order: number;
  permission: z.infer<typeof permissionSlugSchema> | null;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  children: unknown[];
}> = adminMenuSchema.extend({
  children: z.array(z.lazy(() => adminMenuTreeItemSchema)),
});

export const rolesListResponseSchema = z.object({
  roles: z.array(roleSchema),
});

export const permissionsListResponseSchema = z.object({
  permissions: z.array(permissionSchema),
});

export const adminMenusResponseSchema = z.object({
  menus: z.array(adminMenuTreeItemSchema),
});

export const usersListResponseSchema = z.object({
  users: z.array(authUserSchema),
});

export const upsertRoleRequestSchema = z.object({
  slug: z.string().min(2).max(64),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  permissions: z.array(permissionSlugSchema),
});

export const updateUserRolesRequestSchema = z.object({
  roleIds: z.array(z.string()),
  status: userStatusSchema.optional(),
});

export const upsertAdminMenuRequestSchema = z.object({
  label: z.string().min(1).max(120),
  path: z.string().min(1).max(200),
  icon: z.string().max(64).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().optional(),
  permission: permissionSlugSchema.nullable().optional(),
  visible: z.boolean().optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
export type Role = z.infer<typeof roleSchema>;
export type AdminMenu = z.infer<typeof adminMenuSchema>;
