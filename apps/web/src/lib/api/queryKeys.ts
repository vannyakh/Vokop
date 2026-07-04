export const queryKeys = {
  media: {
    all: ['media'] as const,
    status: () => [...queryKeys.media.all, 'status'] as const,
    textEffectPreviews: () => [...queryKeys.media.all, 'text-effect-previews'] as const,
    pixabayImages: (query: string, page: number, perPage: number) =>
      [...queryKeys.media.all, 'pixabay', 'images', query, page, perPage] as const,
    giphyStickers: (mode: 'trending' | 'search', query: string, limit: number, offset: number) =>
      [...queryKeys.media.all, 'giphy', mode, query, limit, offset] as const,
  },
  editor: {
    all: ['editor'] as const,
    catalog: () => [...queryKeys.editor.all, 'catalog'] as const,
  },
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    trash: () => [...queryKeys.projects.all, 'trash'] as const,
    detail: (projectId: string) => [...queryKeys.projects.all, 'detail', projectId] as const,
  },
  admin: {
    all: ['admin'] as const,
    menus: () => [...queryKeys.admin.all, 'menus'] as const,
    roles: () => [...queryKeys.admin.all, 'roles'] as const,
    permissions: () => [...queryKeys.admin.all, 'permissions'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
  },
  video: {
    all: ['video'] as const,
    session: (fileKey: string) => [...queryKeys.video.all, 'session', fileKey] as const,
    filmstrip: (sessionId: string, duration: number) =>
      [...queryKeys.video.all, 'filmstrip', sessionId, duration] as const,
    job: (jobId: string) => [...queryKeys.video.all, 'job', jobId] as const,
  },
} as const;

export function videoFileKey(file: File | null | undefined): string | null {
  if (!file) return null;
  return `${file.name}:${file.size}:${file.lastModified}`;
}
