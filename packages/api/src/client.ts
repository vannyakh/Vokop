import type { AxiosInstance } from 'axios';
import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import { createBrowserApiConfig, type ApiConfig, type BrowserApiOptions } from './config.js';
import { apiRequest, createHttpClient } from './http.js';
import { routes } from './routes.js';
import {
  adminMenuResponseSchema,
  adminMenusResponseSchema,
  applyEditorEditResponseSchema,
  authSessionResponseSchema,
  emailLookupResponseSchema,
  editorCatalogResponseSchema,
  editorPreviewResponseSchema,
  filmstripResponseSchema,
  giphyStickersResponseSchema,
  healthResponseSchema,
  mediaStatusResponseSchema,
  meResponseSchema,
  okResponseSchema,
  permissionsListResponseSchema,
  pixabayImageSearchResponseSchema,
  pixabayVideoSearchResponseSchema,
  roleResponseSchema,
  rolesListResponseSchema,
  startFilmstripJobResponseSchema,
  textEffectPreviewsResponseSchema,
  updateUserRolesRequestSchema,
  upsertAdminMenuRequestSchema,
  upsertRoleRequestSchema,
  usersListResponseSchema,
  projectsListResponseSchema,
  projectResponseSchema,
  createProjectRequestSchema,
  updateProjectRequestSchema,
  videoJobResponseSchema,
  videoProbeResponseSchema,
  videoSessionResponseSchema,
} from './schemas/index.js';
import type {
  ApplyEditorEditResponse,
  AuthSessionResponse,
  EditorCatalogResponse,
  EditorPreviewResponse,
  FilmstripResponse,
  GiphySticker,
  HealthResponse,
  MediaStatusResponse,
  TextEffectPreviewsResponse,
  VideoJobResponse,
  VideoProbeResponse,
  VideoSessionResponse,
} from './schemas/index.js';
import type { StudioToolId } from './schemas/editor.js';

export interface ApiClientOptions extends ApiConfig {
  /** Inject a custom axios instance (tests, interceptors). */
  http?: AxiosInstance;
}

export interface PollJobOptions {
  intervalMs?: number;
  signal?: AbortSignal;
  onUpdate?: (job: VideoJobResponse) => void;
}

export class ApiClient {
  private readonly http: AxiosInstance;

  constructor(options: ApiClientOptions = {}) {
    this.http = options.http ?? createHttpClient(options);
  }

  private get<S extends ZodTypeAny>(
    schema: S,
    url: string,
    message: string,
    params?: Record<string, string | number>,
  ): Promise<z.output<S>> {
    return apiRequest(this.http, schema, { method: 'GET', url, params }, message);
  }

  private postJson<S extends ZodTypeAny>(
    schema: S,
    url: string,
    data: unknown,
    message: string,
  ): Promise<z.output<S>> {
    return apiRequest(this.http, schema, { method: 'POST', url, data }, message);
  }

  private postForm<S extends ZodTypeAny>(
    schema: S,
    url: string,
    form: FormData,
    message: string,
  ): Promise<z.output<S>> {
    return apiRequest(this.http, schema, { method: 'POST', url, data: form }, message);
  }

  async health(): Promise<HealthResponse> {
    return this.get(healthResponseSchema, routes.health, 'Health check failed');
  }

  async probeVideo(file: File): Promise<VideoProbeResponse> {
    const form = new FormData();
    form.append('video', file);
    return this.postForm(videoProbeResponseSchema, routes.video.probe, form, 'Probe failed');
  }

  async filmstrip(file: File, duration: number): Promise<FilmstripResponse> {
    const form = new FormData();
    form.append('video', file);
    form.append('duration', String(duration));
    return this.postForm(filmstripResponseSchema, routes.video.filmstrip, form, 'Filmstrip failed');
  }

  /** Upload once — reuse sessionId for probe, filmstrip, and async jobs. */
  async createVideoSession(file: File): Promise<VideoSessionResponse> {
    const form = new FormData();
    form.append('video', file);
    return this.postForm(
      videoSessionResponseSchema,
      routes.video.session,
      form,
      'Session creation failed',
    );
  }

  async filmstripSession(sessionId: string, duration: number): Promise<FilmstripResponse> {
    return this.postJson(
      filmstripResponseSchema,
      routes.video.sessionFilmstrip(sessionId),
      { duration },
      'Filmstrip failed',
    );
  }

  async startFilmstripJob(sessionId: string, duration: number): Promise<z.infer<typeof startFilmstripJobResponseSchema>> {
    return this.postJson(
      startFilmstripJobResponseSchema,
      routes.video.sessionFilmstripJob(sessionId),
      { duration },
      'Failed to start filmstrip job',
    );
  }

  async getVideoJob(jobId: string): Promise<VideoJobResponse> {
    return this.get(videoJobResponseSchema, routes.video.job(jobId), 'Failed to fetch job');
  }

  /** Poll until job completes; streams partial thumbnails via onUpdate. */
  async waitForVideoJob(jobId: string, options: PollJobOptions = {}): Promise<VideoJobResponse> {
    const intervalMs = options.intervalMs ?? 450;

    while (true) {
      if (options.signal?.aborted) throw new Error('Job cancelled');

      const job = await this.getVideoJob(jobId);
      options.onUpdate?.(job);

      if (job.status === 'completed') return job;
      if (job.status === 'failed') {
        throw new Error(job.error ?? 'Video job failed');
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, intervalMs);
        options.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Job cancelled'));
          },
          { once: true },
        );
      });
    }
  }

  async getEditorCatalog(): Promise<EditorCatalogResponse> {
    return this.get(editorCatalogResponseSchema, routes.video.editorCatalog, 'Failed to load editor catalog');
  }

  async applyEditorEdit(
    sessionId: string,
    tool: StudioToolId,
    presetId: string,
    clipId?: string,
  ): Promise<ApplyEditorEditResponse> {
    return this.postJson(
      applyEditorEditResponseSchema,
      routes.video.editorApply,
      { sessionId, tool, presetId, clipId },
      'Failed to apply edit',
    );
  }

  async previewEditorFilter(
    sessionId: string,
    tool: 'filters' | 'effects',
    presetId: string,
    atTime?: number,
  ): Promise<EditorPreviewResponse> {
    return this.postJson(
      editorPreviewResponseSchema,
      routes.video.editorPreview,
      { sessionId, tool, presetId, atTime },
      'Preview failed',
    );
  }

  async getMediaStatus(): Promise<MediaStatusResponse> {
    return this.get(mediaStatusResponseSchema, routes.media.status, 'Failed to load media status');
  }

  async searchPixabayImages(
    query: string,
    page = 1,
    perPage = 20,
  ): Promise<z.infer<typeof pixabayImageSearchResponseSchema>> {
    return this.get(
      pixabayImageSearchResponseSchema,
      routes.media.pixabayImages,
      'Pixabay image search failed',
      { q: query, page, perPage },
    );
  }

  async searchPixabayVideos(
    query: string,
    page = 1,
    perPage = 20,
  ): Promise<z.infer<typeof pixabayVideoSearchResponseSchema>> {
    return this.get(
      pixabayVideoSearchResponseSchema,
      routes.media.pixabayVideos,
      'Pixabay video search failed',
      { q: query, page, perPage },
    );
  }

  async trendingGiphyStickers(limit = 10, offset = 0): Promise<GiphySticker[]> {
    const data = await this.get(
      giphyStickersResponseSchema,
      routes.media.giphyTrending,
      'Giphy trending failed',
      { limit, offset },
    );
    return data.stickers;
  }

  async searchGiphyStickers(query: string, limit = 10, offset = 0): Promise<GiphySticker[]> {
    const data = await this.get(
      giphyStickersResponseSchema,
      routes.media.giphySearch,
      'Giphy search failed',
      { q: query, limit, offset },
    );
    return data.stickers;
  }

  async getTextEffectPreviews(): Promise<TextEffectPreviewsResponse> {
    return this.get(
      textEffectPreviewsResponseSchema,
      routes.media.textEffectPreviews,
      'Text effect previews failed',
    );
  }

  async login(email: string, password: string): Promise<AuthSessionResponse> {
    return this.postJson(authSessionResponseSchema, routes.auth.login, { email, password }, 'Login failed');
  }

  async lookupEmail(email: string): Promise<z.infer<typeof emailLookupResponseSchema>> {
    return this.postJson(
      emailLookupResponseSchema,
      routes.auth.lookup,
      { email },
      'Email lookup failed',
    );
  }

  async register(email: string, password: string, name: string): Promise<AuthSessionResponse> {
    return this.postJson(
      authSessionResponseSchema,
      routes.auth.register,
      { email, password, name },
      'Registration failed',
    );
  }

  async refreshSession(refreshToken: string): Promise<AuthSessionResponse> {
    return this.postJson(
      authSessionResponseSchema,
      routes.auth.refresh,
      { refreshToken },
      'Refresh failed',
    );
  }

  async logout(refreshToken: string): Promise<z.infer<typeof okResponseSchema>> {
    return this.postJson(
      okResponseSchema,
      routes.auth.logout,
      { refreshToken },
      'Logout failed',
    );
  }

  async getMe(): Promise<z.infer<typeof meResponseSchema>> {
    return this.get(meResponseSchema, routes.auth.me, 'Failed to load profile');
  }

  async listProjects(): Promise<z.infer<typeof projectsListResponseSchema>> {
    return this.get(projectsListResponseSchema, routes.projects.list, 'Failed to load projects');
  }

  async createProject(
    input: z.infer<typeof createProjectRequestSchema>,
  ): Promise<z.infer<typeof projectResponseSchema>> {
    return this.postJson(
      projectResponseSchema,
      routes.projects.create,
      input,
      'Failed to create project',
    );
  }

  async getProject(id: string): Promise<z.infer<typeof projectResponseSchema>> {
    return this.get(projectResponseSchema, routes.projects.get(id), 'Failed to load project');
  }

  async updateProject(
    id: string,
    input: z.infer<typeof updateProjectRequestSchema>,
  ): Promise<z.infer<typeof projectResponseSchema>> {
    return apiRequest(
      this.http,
      projectResponseSchema,
      { method: 'PATCH', url: routes.projects.update(id), data: input },
      'Failed to update project',
    );
  }

  async getAdminMenus(): Promise<z.infer<typeof adminMenusResponseSchema>> {
    return this.get(adminMenusResponseSchema, routes.admin.menus, 'Failed to load admin menus');
  }

  async listRoles(): Promise<z.infer<typeof rolesListResponseSchema>> {
    return this.get(rolesListResponseSchema, routes.admin.roles, 'Failed to load roles');
  }

  async listPermissions(): Promise<z.infer<typeof permissionsListResponseSchema>> {
    return this.get(permissionsListResponseSchema, routes.admin.permissions, 'Failed to load permissions');
  }

  async listUsers(): Promise<z.infer<typeof usersListResponseSchema>> {
    return this.get(usersListResponseSchema, routes.admin.users, 'Failed to load users');
  }

  async createRole(input: z.infer<typeof upsertRoleRequestSchema>): Promise<z.infer<typeof roleResponseSchema>> {
    return this.postJson(
      roleResponseSchema,
      routes.admin.roles,
      input,
      'Failed to create role',
    );
  }

  async updateRole(id: string, input: Partial<z.infer<typeof upsertRoleRequestSchema>>): Promise<z.infer<typeof roleResponseSchema>> {
    return apiRequest(
      this.http,
      roleResponseSchema,
      { method: 'PATCH', url: routes.admin.role(id), data: input },
      'Failed to update role',
    );
  }

  async deleteRole(id: string): Promise<z.infer<typeof okResponseSchema>> {
    return apiRequest(
      this.http,
      okResponseSchema,
      { method: 'DELETE', url: routes.admin.role(id) },
      'Failed to delete role',
    );
  }

  async updateUser(id: string, input: z.infer<typeof updateUserRolesRequestSchema>): Promise<z.infer<typeof meResponseSchema>> {
    return apiRequest(
      this.http,
      meResponseSchema,
      { method: 'PATCH', url: routes.admin.user(id), data: input },
      'Failed to update user',
    );
  }

  async createAdminMenu(input: z.infer<typeof upsertAdminMenuRequestSchema>): Promise<z.infer<typeof adminMenuResponseSchema>> {
    return this.postJson(
      adminMenuResponseSchema,
      routes.admin.menus,
      input,
      'Failed to create menu',
    );
  }

  async updateAdminMenu(
    id: string,
    input: Partial<z.infer<typeof upsertAdminMenuRequestSchema>>,
  ): Promise<z.infer<typeof adminMenuResponseSchema>> {
    return apiRequest(
      this.http,
      adminMenuResponseSchema,
      { method: 'PATCH', url: `${routes.admin.menus}/${id}`, data: input },
      'Failed to update menu',
    );
  }

  async deleteAdminMenu(id: string): Promise<z.infer<typeof okResponseSchema>> {
    return apiRequest(
      this.http,
      okResponseSchema,
      { method: 'DELETE', url: `${routes.admin.menus}/${id}` },
      'Failed to delete menu',
    );
  }
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  return new ApiClient(options);
}

/** Browser/Vite app — uses empty base URL + dev proxy by default. */
export function createBrowserApiClient(
  baseUrl?: string,
  getAccessToken?: () => string | undefined | null,
  options?: BrowserApiOptions,
): ApiClient {
  return createApiClient(createBrowserApiConfig(baseUrl, getAccessToken, options));
}

export { parseData as parseJson } from './http.js';
