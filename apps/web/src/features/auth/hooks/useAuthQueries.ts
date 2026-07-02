import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { userHasPermission } from '@/features/auth/lib/permissions';

export function useAuthMe() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const { user } = await api.getMe();
      setUser(user);
      return user;
    },
    enabled: isLoggedIn,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAdminMenus() {
  const user = useAuthStore((s) => s.user);
  const canAccess = userHasPermission(user, 'admin.access');

  return useQuery({
    queryKey: queryKeys.admin.menus(),
    queryFn: () => api.getAdminMenus(),
    enabled: Boolean(canAccess),
    staleTime: 60_000,
  });
}

export function useAdminRoles() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.admin.roles(),
    queryFn: () => api.listRoles(),
    enabled: userHasPermission(user, 'roles.read'),
    staleTime: 30_000,
  });
}

export function useAdminUsers() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: () => api.listUsers(),
    enabled: userHasPermission(user, 'users.read'),
    staleTime: 30_000,
  });
}

export function useAdminPermissions() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.admin.permissions(),
    queryFn: () => api.listPermissions(),
    enabled: userHasPermission(user, 'roles.read'),
    staleTime: 300_000,
  });
}
