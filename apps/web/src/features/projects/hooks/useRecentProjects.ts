import { useQuery } from '@tanstack/react-query';
import { RECENT_PROJECTS } from '@/features/landing/data/landingContent';
import { mapProjectToRecentItem, type RecentProjectItem } from '@/features/projects/lib/projectDisplay';
import { useAuthStore } from '@/features/auth';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

export function useRecentProjects(): {
  projects: RecentProjectItem[];
  isMock: boolean;
  isLoading: boolean;
  isError: boolean;
} {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const accessToken = useAuthStore((s) => s.accessToken);

  const query = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: async () => {
      const { projects } = await api.listProjects();
      return projects.map(mapProjectToRecentItem);
    },
    enabled: isLoggedIn && Boolean(accessToken),
    staleTime: 30_000,
  });

  if (!isLoggedIn) {
    return {
      projects: RECENT_PROJECTS,
      isMock: true,
      isLoading: false,
      isError: false,
    };
  }

  return {
    projects: query.data ?? [],
    isMock: false,
    isLoading: query.isPending,
    isError: query.isError,
  };
}
