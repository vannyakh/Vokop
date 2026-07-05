import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RECENT_PROJECTS } from '@/features/landing/data/landingContent';
import { mapProjectToRecentItem, type RecentProjectItem } from '@/features/projects/lib/projectDisplay';
import { useAuthStore } from '@/features/auth';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

export function useRecentProjects(options: { trash?: boolean; enabled?: boolean } = {}): {
  projects: RecentProjectItem[];
  isMock: boolean;
  isLoading: boolean;
  isError: boolean;
  trashCount: number;
  moveToTrash: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  isMutating: boolean;
} {
  const trash = Boolean(options.trash);
  const queryEnabled = options.enabled !== false;
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const authReady = isLoggedIn && Boolean(accessToken);

  const listQuery = useQuery({
    queryKey: trash ? queryKeys.projects.trash() : queryKeys.projects.list(),
    queryFn: async () => {
      const { projects } = trash ? await api.listTrashProjects() : await api.listProjects();
      return projects.map(mapProjectToRecentItem);
    },
    enabled: queryEnabled && authReady,
    staleTime: 30_000,
  });

  const trashQuery = useQuery({
    queryKey: queryKeys.projects.trash(),
    queryFn: async () => {
      const { projects } = await api.listTrashProjects();
      return projects;
    },
    enabled: queryEnabled && authReady && !trash,
    staleTime: 30_000,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  };

  const moveToTrashMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.restoreProject(id),
    onSuccess: invalidate,
  });

  const permanentMutation = useMutation({
    mutationFn: (id: string) => api.permanentDeleteProject(id),
    onSuccess: invalidate,
  });

  const emptyTrashMutation = useMutation({
    mutationFn: () => api.emptyTrash(),
    onSuccess: invalidate,
  });

  if (!isLoggedIn) {
    return {
      projects: RECENT_PROJECTS,
      isMock: true,
      isLoading: false,
      isError: false,
      trashCount: 0,
      moveToTrash: async () => undefined,
      restoreProject: async () => undefined,
      permanentDelete: async () => undefined,
      emptyTrash: async () => undefined,
      isMutating: false,
    };
  }

  return {
    projects: listQuery.data ?? [],
    isMock: false,
    isLoading: listQuery.isPending,
    isError: listQuery.isError,
    trashCount: trash ? (listQuery.data?.length ?? 0) : (trashQuery.data?.length ?? 0),
    moveToTrash: async (id) => {
      await moveToTrashMutation.mutateAsync(id);
    },
    restoreProject: async (id) => {
      await restoreMutation.mutateAsync(id);
    },
    permanentDelete: async (id) => {
      await permanentMutation.mutateAsync(id);
    },
    emptyTrash: async () => {
      await emptyTrashMutation.mutateAsync();
    },
    isMutating:
      moveToTrashMutation.isPending ||
      restoreMutation.isPending ||
      permanentMutation.isPending ||
      emptyTrashMutation.isPending,
  };
}
