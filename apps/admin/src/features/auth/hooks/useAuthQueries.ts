import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { useAuthStore, userHasPermission } from '@/features/auth';

function useAuthedQueryEnabled(permission: Parameters<typeof userHasPermission>[1]) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  return Boolean(accessToken) && userHasPermission(user, permission);
}

export function useAuthMe() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const { user } = await api.getMe();
      setUser(user);
      return user;
    },
    enabled: isLoggedIn && Boolean(accessToken),
    staleTime: 60_000,
    retry: false,
  });
}

export function useAdminMenus() {
  const canAccess = useAuthedQueryEnabled('admin.access');

  return useQuery({
    queryKey: queryKeys.admin.menus(),
    queryFn: () => api.getAdminMenus(),
    enabled: canAccess,
  });
}

export function useAdminRoles() {
  const canAccess = useAuthedQueryEnabled('roles.read');

  return useQuery({
    queryKey: queryKeys.admin.roles(),
    queryFn: () => api.listRoles(),
    enabled: canAccess,
  });
}

export function useAdminUsers() {
  const canAccess = useAuthedQueryEnabled('users.read');

  return useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: () => api.listUsers(),
    enabled: canAccess,
  });
}

export function useAdminPermissions() {
  const canAccess = useAuthedQueryEnabled('roles.read');

  return useQuery({
    queryKey: queryKeys.admin.permissions(),
    queryFn: () => api.listPermissions(),
    enabled: canAccess,
  });
}
