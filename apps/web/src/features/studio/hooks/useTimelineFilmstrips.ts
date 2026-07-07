import { useEffect, useMemo, useRef, useState } from 'react';
import { FILMSTRIP_THUMB_WIDTH } from '@vokop/shared';
import { generateFilmstrip } from '@/features/studio/lib/generateFilmstrip';
import {
  collectFilmstripSources,
  resolveClipFilmstripSource,
} from '@/features/studio/lib/resolveClipFilmstripSource';
import { filmstripThumbsForClip } from '@/features/studio/lib/timelineFilmstrip';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import { useVideoToolsHealth } from '@/features/studio/hooks/useVideoToolsHealth';

interface FilmstripCacheEntry {
  thumbnails: string[];
  loading: boolean;
  progress: number;
}

function revokeThumbnailUrls(urls: string[]) {
  urls.forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
}

export interface ClipFilmstripPreview {
  thumbs: string[] | undefined;
  loading: boolean;
  progress: number;
  sourceDuration: number;
}

const EMPTY_ENTRY: FilmstripCacheEntry = { thumbnails: [], loading: false, progress: 0 };

export function useTimelineFilmstrips(
  videoClips: MediaClip[],
  ctx: {
    videoFile: File | null;
    videoUrl: string | null;
    mediaAssets: MediaAsset[];
    mediaDuration: number;
    videoSessionId: string | null;
  },
) {
  const { ffmpegOk, isReady } = useVideoToolsHealth();
  const [cache, setCache] = useState<Map<string, FilmstripCacheEntry>>(new Map());
  const runIdRef = useRef(0);
  const urlsRef = useRef<Map<string, string[]>>(new Map());

  const sources = useMemo(
    () => collectFilmstripSources(videoClips, ctx),
    [videoClips, ctx.videoFile, ctx.videoUrl, ctx.mediaAssets, ctx.mediaDuration, ctx.videoSessionId],
  );

  const sourceKeys = useMemo(() => sources.map((s) => s.key).join('|'), [sources]);
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  useEffect(() => {
    if (!isReady) return;

    const runId = ++runIdRef.current;
    const controllers = new Map<string, AbortController>();
    const activeSources = sourcesRef.current;

    const updateEntry = (key: string, patch: Partial<FilmstripCacheEntry>) => {
      if (runId !== runIdRef.current) return;
      setCache((prev) => {
        const next = new Map(prev);
        const current = next.get(key) ?? EMPTY_ENTRY;
        next.set(key, { ...current, ...patch });
        return next;
      });
    };

    for (const source of activeSources) {
      if (!source.file || source.duration <= 0) {
        updateEntry(source.key, { loading: false, progress: 0, thumbnails: [] });
        continue;
      }

      const controller = new AbortController();
      controllers.set(source.key, controller);
      updateEntry(source.key, { loading: true, progress: 0, thumbnails: [] });

      void generateFilmstrip({
        file: source.file,
        duration: source.duration,
        videoSessionId: source.sessionId,
        signal: controller.signal,
        ffmpegOk,
        onProgress: (progress, partial) => {
          if (partial?.length) {
            const prevUrls = urlsRef.current.get(source.key) ?? [];
            revokeThumbnailUrls(prevUrls);
            urlsRef.current.set(source.key, partial);
            updateEntry(source.key, { thumbnails: partial, progress, loading: true });
          } else {
            updateEntry(source.key, { progress, loading: true });
          }
        },
      })
        .then((frames) => {
          if (runId !== runIdRef.current || controller.signal.aborted) {
            revokeThumbnailUrls(frames);
            return;
          }
          const prevUrls = urlsRef.current.get(source.key) ?? [];
          revokeThumbnailUrls(prevUrls);
          urlsRef.current.set(source.key, frames);
          updateEntry(source.key, {
            thumbnails: frames,
            loading: false,
            progress: frames.length ? 100 : 0,
          });
        })
        .catch(() => {
          if (runId !== runIdRef.current) return;
          updateEntry(source.key, { loading: false, progress: 0 });
        });
    }

    return () => {
      runIdRef.current += 1;
      for (const controller of controllers.values()) controller.abort();
    };
  }, [sourceKeys, ffmpegOk, isReady]);

  const resolveClipPreview = useMemo(() => {
    return (
      clip: MediaClip,
      clipPixelWidth: number,
      clipSource: { sourceStart?: number; duration: number },
    ): ClipFilmstripPreview => {
      const source = resolveClipFilmstripSource(clip, ctx);
      if (!source) {
        return { thumbs: undefined, loading: false, progress: 0, sourceDuration: 0 };
      }

      const entry = cache.get(source.key) ?? { ...EMPTY_ENTRY, loading: Boolean(source.file) };
      const thumbs =
        entry.thumbnails.length > 0 && source.duration > 0
          ? filmstripThumbsForClip(
              entry.thumbnails,
              source.duration,
              clipSource,
              clipPixelWidth,
              FILMSTRIP_THUMB_WIDTH,
            )
          : undefined;

      return {
        thumbs,
        loading: entry.loading && !thumbs?.length,
        progress: entry.progress,
        sourceDuration: source.duration,
      };
    };
  }, [
    cache,
    ctx.videoFile,
    ctx.videoUrl,
    ctx.mediaAssets,
    ctx.mediaDuration,
    ctx.videoSessionId,
  ]);

  return {
    resolveClipPreview,
    thumbWidth: FILMSTRIP_THUMB_WIDTH,
  };
}
