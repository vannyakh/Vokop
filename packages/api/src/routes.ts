/**
 * Public API paths (gateway-facing).
 * Keep in sync with `services/gateway/src/proxy/routes.ts`.
 */
export const API_PREFIX = '/api/v1';

export const routes = {
  health: `${API_PREFIX}/health`,

  /** video-tools — sessions, jobs, probe, filmstrip */
  video: {
    health: `${API_PREFIX}/video/health`,
    probe: `${API_PREFIX}/video/probe`,
    filmstrip: `${API_PREFIX}/video/filmstrip`,
    session: `${API_PREFIX}/video/session`,
    sessionFilmstrip: (sessionId: string) =>
      `${API_PREFIX}/video/session/${sessionId}/filmstrip`,
    sessionFilmstripJob: (sessionId: string) =>
      `${API_PREFIX}/video/session/${sessionId}/jobs/filmstrip`,
    job: (jobId: string) => `${API_PREFIX}/video/jobs/${jobId}`,
  },

  /** video-tools — editor presets (catalog / apply / preview) */
  presets: {
    catalog: `${API_PREFIX}/presets/catalog`,
    apply: `${API_PREFIX}/presets/apply`,
    preview: `${API_PREFIX}/presets/preview`,
    transitions: `${API_PREFIX}/presets/transitions`,
    filters: `${API_PREFIX}/presets/filters`,
    textEffects: `${API_PREFIX}/presets/text-effects`,
  },

  /** video-tools — stock media + status */
  media: {
    status: `${API_PREFIX}/media/status`,
    pixabayImages: `${API_PREFIX}/media/pixabay/images`,
    pixabayVideos: `${API_PREFIX}/media/pixabay/videos`,
    giphyTrending: `${API_PREFIX}/media/giphy/stickers/trending`,
    giphySearch: `${API_PREFIX}/media/giphy/stickers/search`,
    textEffectPreviews: `${API_PREFIX}/media/text-effects/previews`,
  },

  /** studio service — project records (soft-delete / trash) */
  projects: {
    list: `${API_PREFIX}/projects`,
    create: `${API_PREFIX}/projects`,
    trash: `${API_PREFIX}/projects/trash`,
    emptyTrash: `${API_PREFIX}/projects/trash`,
    get: (id: string) => `${API_PREFIX}/projects/${id}`,
    update: (id: string) => `${API_PREFIX}/projects/${id}`,
    /** Soft-delete → trash */
    delete: (id: string) => `${API_PREFIX}/projects/${id}`,
    restore: (id: string) => `${API_PREFIX}/projects/${id}/restore`,
    /** Permanent delete (only while in trash) */
    permanentDelete: (id: string) => `${API_PREFIX}/projects/${id}/permanent`,
  },

  /** video-tools — assets / export / AI (reserved) */
  assets: {
    list: `${API_PREFIX}/assets`,
    get: (id: string) => `${API_PREFIX}/assets/${id}`,
  },
  export: {
    project: (projectId: string) => `${API_PREFIX}/export/projects/${projectId}`,
    job: (jobId: string) => `${API_PREFIX}/export/jobs/${jobId}`,
    /** Export Video modal — upload a recorded clip for server-side transcode/watermark. */
    render: `${API_PREFIX}/export/render`,
    download: (jobId: string) => `${API_PREFIX}/export/jobs/${jobId}/download`,
  },
  /** ai-content — text, image, voice, translate, transcripts, agent */
  ai: {
    capabilities: `${API_PREFIX}/ai/capabilities`,
    transcribe: `${API_PREFIX}/ai/transcribe`,
    translate: `${API_PREFIX}/ai/translate`,
    analyze: `${API_PREFIX}/ai/analyze`,
    imageAnalyze: `${API_PREFIX}/ai/image/analyze`,
    voiceTts: `${API_PREFIX}/ai/voice/tts`,
    textAssist: `${API_PREFIX}/ai/text`,
    subtitles: `${API_PREFIX}/ai/subtitles`,
    clipSuggest: `${API_PREFIX}/ai/clip-suggest`,
    agent: `${API_PREFIX}/ai/agent`,
    llmProviders: `${API_PREFIX}/ai/llm/providers`,
    llmComplete: `${API_PREFIX}/ai/llm/complete`,
    job: (jobId: string) => `${API_PREFIX}/ai/jobs/${jobId}`,
  },

  /** auth service — account & security only */
  auth: {
    login: `${API_PREFIX}/auth/login`,
    lookup: `${API_PREFIX}/auth/lookup`,
    register: `${API_PREFIX}/auth/register`,
    refresh: `${API_PREFIX}/auth/refresh`,
    logout: `${API_PREFIX}/auth/logout`,
    me: `${API_PREFIX}/auth/me`,
  },

  /** admin-service — console RBAC */
  admin: {
    menus: `${API_PREFIX}/admin/menus`,
    menu: (id: string) => `${API_PREFIX}/admin/menus/${id}`,
    roles: `${API_PREFIX}/admin/roles`,
    role: (id: string) => `${API_PREFIX}/admin/roles/${id}`,
    permissions: `${API_PREFIX}/admin/permissions`,
    users: `${API_PREFIX}/admin/users`,
    user: (id: string) => `${API_PREFIX}/admin/users/${id}`,
  },
} as const;

/** @deprecated Use `routes.presets.*` — kept for older call sites during migration. */
export const legacyVideoEditorRoutes = {
  editorCatalog: routes.presets.catalog,
  editorApply: routes.presets.apply,
  editorPreview: routes.presets.preview,
} as const;
