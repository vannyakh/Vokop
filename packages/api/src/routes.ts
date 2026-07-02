export const API_PREFIX = '/api/v1';

export const routes = {
  health: `${API_PREFIX}/health`,
  video: {
    probe: `${API_PREFIX}/video/probe`,
    filmstrip: `${API_PREFIX}/video/filmstrip`,
    session: `${API_PREFIX}/video/session`,
    sessionFilmstrip: (sessionId: string) => `${API_PREFIX}/video/session/${sessionId}/filmstrip`,
    sessionFilmstripJob: (sessionId: string) =>
      `${API_PREFIX}/video/session/${sessionId}/jobs/filmstrip`,
    job: (jobId: string) => `${API_PREFIX}/video/jobs/${jobId}`,
    editorCatalog: `${API_PREFIX}/video/editor/catalog`,
    editorApply: `${API_PREFIX}/video/editor/apply`,
    editorPreview: `${API_PREFIX}/video/editor/preview`,
  },
  media: {
    status: `${API_PREFIX}/media/status`,
    pixabayImages: `${API_PREFIX}/media/pixabay/images`,
    pixabayVideos: `${API_PREFIX}/media/pixabay/videos`,
    giphyTrending: `${API_PREFIX}/media/giphy/stickers/trending`,
    giphySearch: `${API_PREFIX}/media/giphy/stickers/search`,
    textEffectPreviews: `${API_PREFIX}/media/text-effects/previews`,
  },
} as const;
