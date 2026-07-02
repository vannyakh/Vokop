import { handleResponse, parseJson } from './http.js';
import { routes } from './routes.js';
import {
  applyEditorEditResponseSchema,
  editorCatalogResponseSchema,
  editorPreviewResponseSchema,
  filmstripResponseSchema,
  giphyStickersResponseSchema,
  healthResponseSchema,
  mediaStatusResponseSchema,
  pixabayImageSearchResponseSchema,
  pixabayVideoSearchResponseSchema,
  startFilmstripJobResponseSchema,
  textEffectPreviewsResponseSchema,
  videoJobResponseSchema,
  videoProbeResponseSchema,
  videoSessionResponseSchema,
} from './schemas/index.js';
import type {
  ApplyEditorEditResponse,
  EditorCatalogResponse,
  EditorPreviewResponse,
  FilmstripResponse,
  GiphySticker,
  HealthResponse,
  MediaStatusResponse,
  PixabayImage,
  PixabayVideo,
  TextEffectPreviewsResponse,
  VideoJobResponse,
  VideoProbeResponse,
  VideoSessionResponse,
} from './schemas/index.js';
import type { StudioToolId } from './schemas/editor.js';

export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface PollJobOptions {
  intervalMs?: number;
  signal?: AbortSignal;
  onUpdate?: (job: VideoJobResponse) => void;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
    this.fetchFn = options.fetch ?? fetch.bind(globalThis);
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async health(): Promise<HealthResponse> {
    const res = await this.fetchFn(this.url(routes.health));
    return handleResponse(healthResponseSchema, res, 'Health check failed');
  }

  async probeVideo(file: File): Promise<VideoProbeResponse> {
    const form = new FormData();
    form.append('video', file);

    const res = await this.fetchFn(this.url(routes.video.probe), {
      method: 'POST',
      body: form,
    });

    return handleResponse(videoProbeResponseSchema, res, 'Probe failed');
  }

  async filmstrip(file: File, duration: number): Promise<FilmstripResponse> {
    const form = new FormData();
    form.append('video', file);
    form.append('duration', String(duration));

    const res = await this.fetchFn(this.url(routes.video.filmstrip), {
      method: 'POST',
      body: form,
    });

    return handleResponse(filmstripResponseSchema, res, 'Filmstrip failed');
  }

  /** Upload once — reuse sessionId for probe, filmstrip, and async jobs. */
  async createVideoSession(file: File): Promise<VideoSessionResponse> {
    const form = new FormData();
    form.append('video', file);

    const res = await this.fetchFn(this.url(routes.video.session), {
      method: 'POST',
      body: form,
    });

    return handleResponse(videoSessionResponseSchema, res, 'Session creation failed');
  }

  async filmstripSession(sessionId: string, duration: number): Promise<FilmstripResponse> {
    const res = await this.fetchFn(this.url(routes.video.sessionFilmstrip(sessionId)), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration }),
    });

    return handleResponse(filmstripResponseSchema, res, 'Filmstrip failed');
  }

  async startFilmstripJob(sessionId: string, duration: number): Promise<{ jobId: string }> {
    const res = await this.fetchFn(this.url(routes.video.sessionFilmstripJob(sessionId)), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration }),
    });

    return handleResponse(startFilmstripJobResponseSchema, res, 'Failed to start filmstrip job');
  }

  async getVideoJob(jobId: string): Promise<VideoJobResponse> {
    const res = await this.fetchFn(this.url(routes.video.job(jobId)));
    return handleResponse(videoJobResponseSchema, res, 'Failed to fetch job');
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
    const res = await this.fetchFn(this.url(routes.video.editorCatalog));
    return handleResponse(editorCatalogResponseSchema, res, 'Failed to load editor catalog');
  }

  async applyEditorEdit(
    sessionId: string,
    tool: StudioToolId,
    presetId: string,
    clipId?: string,
  ): Promise<ApplyEditorEditResponse> {
    const res = await this.fetchFn(this.url(routes.video.editorApply), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, tool, presetId, clipId }),
    });
    return handleResponse(applyEditorEditResponseSchema, res, 'Failed to apply edit');
  }

  async previewEditorFilter(
    sessionId: string,
    tool: 'filters' | 'effects',
    presetId: string,
    atTime?: number,
  ): Promise<EditorPreviewResponse> {
    const res = await this.fetchFn(this.url(routes.video.editorPreview), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, tool, presetId, atTime }),
    });
    return handleResponse(editorPreviewResponseSchema, res, 'Preview failed');
  }

  async getMediaStatus(): Promise<MediaStatusResponse> {
    const res = await this.fetchFn(this.url(routes.media.status));
    return handleResponse(mediaStatusResponseSchema, res, 'Failed to load media status');
  }

  async searchPixabayImages(
    query: string,
    page = 1,
    perPage = 20,
  ): Promise<{ total: number; totalHits: number; hits: PixabayImage[] }> {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      perPage: String(perPage),
    });
    const res = await this.fetchFn(`${this.url(routes.media.pixabayImages)}?${params}`);
    return handleResponse(pixabayImageSearchResponseSchema, res, 'Pixabay image search failed');
  }

  async searchPixabayVideos(
    query: string,
    page = 1,
    perPage = 20,
  ): Promise<{ total: number; totalHits: number; hits: PixabayVideo[] }> {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      perPage: String(perPage),
    });
    const res = await this.fetchFn(`${this.url(routes.media.pixabayVideos)}?${params}`);
    return handleResponse(pixabayVideoSearchResponseSchema, res, 'Pixabay video search failed');
  }

  async trendingGiphyStickers(limit = 10, offset = 0): Promise<GiphySticker[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const res = await this.fetchFn(`${this.url(routes.media.giphyTrending)}?${params}`);
    const data = await handleResponse(giphyStickersResponseSchema, res, 'Giphy trending failed');
    return data.stickers;
  }

  async searchGiphyStickers(
    query: string,
    limit = 10,
    offset = 0,
  ): Promise<GiphySticker[]> {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      offset: String(offset),
    });
    const res = await this.fetchFn(`${this.url(routes.media.giphySearch)}?${params}`);
    const data = await handleResponse(giphyStickersResponseSchema, res, 'Giphy search failed');
    return data.stickers;
  }

  async getTextEffectPreviews(): Promise<TextEffectPreviewsResponse> {
    const res = await this.fetchFn(this.url(routes.media.textEffectPreviews));
    return handleResponse(textEffectPreviewsResponseSchema, res, 'Text effect previews failed');
  }
}

export function createApiClient(options?: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}

export { parseJson };
