/**
 * Omnitool integration (browser video tools).
 * @see https://github.com/omni-media/omnitool
 *
 * Server-side FFmpeg remains in `services/video-tools`.
 * Omnitool powers client-side filmstrip, timeline build, and future export.
 */
export { getOmni, loadOmniMedia, Driver, Omni, Datafile } from '@/features/studio/lib/omniTool/client';
export { extractFilmstripWithOmnitool } from '@/features/studio/lib/omniTool/filmstrip';
export { buildOmniTimelineFromVideoClips } from '@/features/studio/lib/omniTool/timeline';
