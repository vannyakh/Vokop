export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  admin: {
    all: ['admin'] as const,
    menus: () => [...queryKeys.admin.all, 'menus'] as const,
    roles: () => [...queryKeys.admin.all, 'roles'] as const,
    permissions: () => [...queryKeys.admin.all, 'permissions'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
  },
} as const;
