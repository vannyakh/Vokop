import type { AxiosInstance } from 'axios';
import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import { createBrowserApiConfig, type ApiConfig, type BrowserApiOptions } from './config.js';
import { apiRequest, createHttpClient, toApiRequestError } from './http.js';
import { routes } from './routes.js';
import {
  adminMenuResponseSchema,
  adminMenusResponseSchema,
  agentRunRequestSchema,
  agentRunResponseSchema,
  aiCapabilitiesResponseSchema,
  aiJobResponseSchema,
  applyEditorEditResponseSchema,
  authSessionResponseSchema,
  clipSuggestRequestSchema,
  clipSuggestResponseSchema,
  emailLookupResponseSchema,
  editorCatalogResponseSchema,
  editorPreviewResponseSchema,
  exportComposedRenderMetaSchema,
  exportRenderSettingsSchema,
  filmstripResponseSchema,
  giphyStickersResponseSchema,
  healthResponseSchema,
  imageAnalyzeRequestSchema,
  imageAnalyzeResponseSchema,
  llmCompleteRequestSchema,
  llmCompleteResponseSchema,
  llmProvidersResponseSchema,
  mediaStatusResponseSchema,
  meResponseSchema,
  okResponseSchema,
  permissionsListResponseSchema,
  pixabayImageSearchResponseSchema,
  pixabayVideoSearchResponseSchema,
  roleResponseSchema,
  rolesListResponseSchema,
  startAiJobResponseSchema,
  startExportRenderResponseSchema,
  startFilmstripJobResponseSchema,
  subtitlesRequestSchema,
  subtitlesResponseSchema,
  textAssistRequestSchema,
  textAssistResponseSchema,
  textEffectPreviewsResponseSchema,
  transcribeRequestSchema,
  translateRequestSchema,
  translateResponseSchema,
  updateUserRolesRequestSchema,
  videoAnalyzeRequestSchema,
  videoAnalyzeResponseSchema,
  voiceTtsRequestSchema,
  voiceTtsResponseSchema,
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
  videoToolsHealthResponseSchema,
} from './schemas/index.js';
import type {
  AgentRunRequest,
  AgentRunResponse,
  AiCapabilitiesResponse,
  AiJobResponse,
  ApplyEditorEditResponse,
  AuthSessionResponse,
  ClipSuggestRequest,
  ClipSuggestResponse,
  EditorCatalogResponse,
  EditorPreviewResponse,
  ExportComposedRenderMeta,
  ExportRenderSettings,
  FilmstripResponse,
  GiphySticker,
  HealthResponse,
  ImageAnalyzeRequest,
  ImageAnalyzeResponse,
  LlmCompleteRequest,
  LlmCompleteResponse,
  LlmProvidersResponse,
  MediaStatusResponse,
  StartAiJobResponse,
  StartExportRenderResponse,
  SubtitlesRequest,
  SubtitlesResponse,
  TextAssistRequest,
  TextAssistResponse,
  TextEffectPreviewsResponse,
  TranscribeRequest,
  TranslateRequest,
  TranslateResponse,
  VideoJobResponse,
  VideoProbeResponse,
  VideoSessionResponse,
  VideoToolsHealthResponse,
  VideoAnalyzeRequest,
  VideoAnalyzeResponse,
  VoiceTtsRequest,
  VoiceTtsResponse,
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

export interface PollAiJobOptions {
  intervalMs?: number;
  signal?: AbortSignal;
  onUpdate?: (job: AiJobResponse) => void;
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

  async videoToolsHealth(): Promise<VideoToolsHealthResponse> {
    return this.get(
      videoToolsHealthResponseSchema,
      routes.video.health,
      'Video tools health check failed',
    );
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

  // ─── Export Video (local render: transcode + watermark) ───────────────────

  /** Upload a recorded clip for server-side transcode/watermark; returns a pollable job. */
  async startExportRender(
    file: Blob,
    settings: ExportRenderSettings,
  ): Promise<StartExportRenderResponse> {
    const data = exportRenderSettingsSchema.parse(settings);
    const ext = file.type.includes('mp4') ? 'mp4' : 'webm';
    const form = new FormData();
    form.append('recording', file, `recording.${ext}`);
    form.append('settings', JSON.stringify(data));
    return this.postForm(
      startExportRenderResponseSchema,
      routes.export.render,
      form,
      'Failed to start export',
    );
  }

  /** Upload WebCodecs H.264 + timeline audio snapshot for server-side mux/transcode. */
  async startComposedExportRender(
    composedVideo: Blob,
    meta: ExportComposedRenderMeta,
    voiceAudio?: Blob | null,
  ): Promise<StartExportRenderResponse> {
    const parsedMeta = exportComposedRenderMetaSchema.parse(meta);
    const form = new FormData();
    form.append('composedVideo', composedVideo, 'composed.h264');
    form.append('meta', JSON.stringify(parsedMeta));
    if (voiceAudio && voiceAudio.size > 0) {
      form.append('voiceAudio', voiceAudio, 'voice.webm');
    }
    return this.postForm(
      startExportRenderResponseSchema,
      routes.export.renderComposed,
      form,
      'Failed to start composed export',
    );
  }

  async getExportJob(jobId: string): Promise<VideoJobResponse> {
    return this.get(videoJobResponseSchema, routes.export.job(jobId), 'Failed to fetch export job');
  }

  /** Poll an export render job until it completes or fails. */
  async waitForExportJob(jobId: string, options: PollJobOptions = {}): Promise<VideoJobResponse> {
    const intervalMs = options.intervalMs ?? 450;

    while (true) {
      if (options.signal?.aborted) throw new Error('Export cancelled');

      const job = await this.getExportJob(jobId);
      options.onUpdate?.(job);

      if (job.status === 'completed') return job;
      if (job.status === 'failed') {
        throw new Error(job.error ?? 'Export failed');
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, intervalMs);
        options.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Export cancelled'));
          },
          { once: true },
        );
      });
    }
  }

  /** Download the finished export render as a Blob. */
  async downloadExportJob(jobId: string): Promise<Blob> {
    try {
      const { data } = await this.http.request<Blob>({
        method: 'GET',
        url: routes.export.download(jobId),
        responseType: 'blob',
      });
      return data;
    } catch (err) {
      throw toApiRequestError(err, 'Failed to download export');
    }
  }

  // ─── ai-content (text, image, voice, translate, transcripts) ──────────────

  async getAiCapabilities(): Promise<AiCapabilitiesResponse> {
    return this.get(
      aiCapabilitiesResponseSchema,
      routes.ai.capabilities,
      'Failed to load AI capabilities',
    );
  }

  async startTranscribe(body: TranscribeRequest): Promise<StartAiJobResponse> {
    const data = transcribeRequestSchema.parse(body);
    return this.postJson(
      startAiJobResponseSchema,
      routes.ai.transcribe,
      data,
      'Failed to start transcription',
    );
  }

  async getAiJob(jobId: string): Promise<AiJobResponse> {
    return this.get(aiJobResponseSchema, routes.ai.job(jobId), 'Failed to fetch AI job');
  }

  async waitForAiJob(jobId: string, options: PollAiJobOptions = {}): Promise<AiJobResponse> {
    const intervalMs = options.intervalMs ?? 450;

    while (true) {
      if (options.signal?.aborted) throw new Error('Job cancelled');

      const job = await this.getAiJob(jobId);
      options.onUpdate?.(job);

      if (job.status === 'completed') return job;
      if (job.status === 'failed') {
        throw new Error(job.error ?? 'AI job failed');
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

  async translate(body: TranslateRequest): Promise<TranslateResponse> {
    const data = translateRequestSchema.parse(body);
    return this.postJson(translateResponseSchema, routes.ai.translate, data, 'Translation failed');
  }

  async analyzeImage(body: ImageAnalyzeRequest): Promise<ImageAnalyzeResponse> {
    const data = imageAnalyzeRequestSchema.parse(body);
    return this.postJson(
      imageAnalyzeResponseSchema,
      routes.ai.imageAnalyze,
      data,
      'Image analysis failed',
    );
  }

  async analyzeVideo(body: VideoAnalyzeRequest): Promise<VideoAnalyzeResponse> {
    const data = videoAnalyzeRequestSchema.parse(body);
    return this.postJson(
      videoAnalyzeResponseSchema,
      routes.ai.analyze,
      data,
      'Video analysis failed',
    );
  }

  async synthesizeSpeech(body: VoiceTtsRequest): Promise<VoiceTtsResponse> {
    const data = voiceTtsRequestSchema.parse(body);
    return this.postJson(voiceTtsResponseSchema, routes.ai.voiceTts, data, 'TTS failed');
  }

  async assistText(body: TextAssistRequest): Promise<TextAssistResponse> {
    const data = textAssistRequestSchema.parse(body);
    return this.postJson(textAssistResponseSchema, routes.ai.textAssist, data, 'Text assist failed');
  }

  async buildSubtitles(body: SubtitlesRequest): Promise<SubtitlesResponse> {
    const data = subtitlesRequestSchema.parse(body);
    return this.postJson(
      subtitlesResponseSchema,
      routes.ai.subtitles,
      data,
      'Failed to build subtitles',
    );
  }

  async suggestClips(body: ClipSuggestRequest): Promise<ClipSuggestResponse> {
    const data = clipSuggestRequestSchema.parse(body);
    return this.postJson(
      clipSuggestResponseSchema,
      routes.ai.clipSuggest,
      data,
      'Failed to suggest clips',
    );
  }

  async runAgent(body: AgentRunRequest): Promise<AgentRunResponse> {
    const data = agentRunRequestSchema.parse(body);
    return this.postJson(agentRunResponseSchema, routes.ai.agent, data, 'Agent run failed');
  }

  async listLlmProviders(): Promise<LlmProvidersResponse> {
    return this.get(
      llmProvidersResponseSchema,
      routes.ai.llmProviders,
      'Failed to list LLM providers',
    );
  }

  async llmComplete(body: LlmCompleteRequest): Promise<LlmCompleteResponse> {
    const data = llmCompleteRequestSchema.parse(body);
    return this.postJson(
      llmCompleteResponseSchema,
      routes.ai.llmComplete,
      data,
      'LLM completion failed',
    );
  }

  async getEditorCatalog(): Promise<EditorCatalogResponse> {
    return this.get(editorCatalogResponseSchema, routes.presets.catalog, 'Failed to load editor catalog');
  }

  async applyEditorEdit(
    sessionId: string,
    tool: StudioToolId,
    presetId: string,
    clipId?: string,
  ): Promise<ApplyEditorEditResponse> {
    return this.postJson(
      applyEditorEditResponseSchema,
      routes.presets.apply,
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
      routes.presets.preview,
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

  /** Soft-delete: move project to trash. */
  async deleteProject(id: string): Promise<z.infer<typeof projectResponseSchema>> {
    return apiRequest(
      this.http,
      projectResponseSchema,
      { method: 'DELETE', url: routes.projects.delete(id) },
      'Failed to move project to trash',
    );
  }

  async listTrashProjects(): Promise<z.infer<typeof projectsListResponseSchema>> {
    return this.get(projectsListResponseSchema, routes.projects.trash, 'Failed to load trash');
  }

  async restoreProject(id: string): Promise<z.infer<typeof projectResponseSchema>> {
    return this.postJson(
      projectResponseSchema,
      routes.projects.restore(id),
      {},
      'Failed to restore project',
    );
  }

  /** Permanent delete — project must already be in trash. */
  async permanentDeleteProject(id: string): Promise<z.infer<typeof okResponseSchema>> {
    return apiRequest(
      this.http,
      okResponseSchema,
      { method: 'DELETE', url: routes.projects.permanentDelete(id) },
      'Failed to permanently delete project',
    );
  }

  async emptyTrash(): Promise<z.infer<typeof okResponseSchema>> {
    return apiRequest(
      this.http,
      okResponseSchema,
      { method: 'DELETE', url: routes.projects.emptyTrash },
      'Failed to empty trash',
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
      { method: 'PATCH', url: routes.admin.menu(id), data: input },
      'Failed to update menu',
    );
  }

  async deleteAdminMenu(id: string): Promise<z.infer<typeof okResponseSchema>> {
    return apiRequest(
      this.http,
      okResponseSchema,
      { method: 'DELETE', url: routes.admin.menu(id) },
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
