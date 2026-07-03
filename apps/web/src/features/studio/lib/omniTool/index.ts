/**
 * Omnitool integration (browser video tools).
 * @see https://github.com/omni-media/omnitool
 *
 * Server-side FFmpeg remains in `services/video-tools`.
 * Omnitool powers client-side filmstrip, timeline build, and future export.
 *
 * All entry points use dynamic `import()` so Pixi/eventemitter3 only load when needed.
 */
export { getOmni, loadOmniMedia } from '@/features/studio/lib/omniTool/client';
export { extractFilmstripWithOmnitool } from '@/features/studio/lib/omniTool/filmstrip';
export { buildOmniTimelineFromVideoClips } from '@/features/studio/lib/omniTool/timeline';
