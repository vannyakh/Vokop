import {
  parseTimeline,
  type Timeline,
  type VideoClip,
  type AudioClip,
} from '@vokop/pipeline';

export type ExportResolution = '1080p' | '720p' | '480p' | 'original';

const RESOLUTION_DIMS: Record<Exclude<ExportResolution, 'original'>, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
};

type LegacyClip = {
  id?: unknown;
  assetId?: unknown;
  kind?: unknown;
  startAtSec?: unknown;
  inPointSec?: unknown;
  durationSec?: unknown;
  track?: unknown;
  volume?: unknown;
  start?: unknown;
  in?: unknown;
  duration?: unknown;
  muted?: unknown;
  speed?: unknown;
};

/**
 * Convert a render job timeline snapshot into `@vokop/pipeline` Timeline.
 * Accepts package-native `{ tracks: [...] }` or legacy flat `{ clips: [...] }`.
 */
export function snapshotToTimeline(
  snapshot: Record<string, unknown>,
  opts: { fps: number; resolution: ExportResolution },
): Timeline {
  const dims = resolveCanvasSize(snapshot, opts.resolution);

  if (Array.isArray(snapshot.tracks)) {
    return parseTimeline({
      version: 1,
      width: dims.width,
      height: dims.height,
      fps: Number(snapshot.fps ?? opts.fps),
      background: typeof snapshot.background === 'string' ? snapshot.background : '#000000',
      tracks: snapshot.tracks,
    });
  }

  const rawClips = (snapshot.clips ?? []) as LegacyClip[];
  const videoByTrack = new Map<number, VideoClip[]>();
  const audioByTrack = new Map<number, AudioClip[]>();

  for (const raw of rawClips) {
    const assetId = typeof raw.assetId === 'string' ? raw.assetId : undefined;
    if (!assetId) continue;

    const id = String(raw.id ?? assetId);
    const start = Number(raw.startAtSec ?? raw.start ?? 0);
    const duration = Number(raw.durationSec ?? raw.duration ?? 0);
    if (!(duration > 0)) continue;

    const track = Number(raw.track ?? 0);
    const kind = String(raw.kind ?? 'video');
    const volume = Number(raw.volume ?? 1);
    const sourceIn = Number(raw.inPointSec ?? raw.in ?? 0);
    const speed = Number(raw.speed ?? 1);

    if (kind === 'audio') {
      const list = audioByTrack.get(track) ?? [];
      list.push({
        id,
        assetId,
        start,
        duration,
        in: sourceIn,
        speed: speed > 0 ? speed : 1,
        volume: Number.isFinite(volume) ? volume : 1,
        fadeInSec: 0,
        fadeOutSec: 0,
      });
      audioByTrack.set(track, list);
      continue;
    }

    // video / image / default
    const list = videoByTrack.get(track) ?? [];
    list.push({
      id,
      assetId,
      start,
      duration,
      in: sourceIn,
      speed: speed > 0 ? speed : 1,
      fit: 'contain',
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      muted: Boolean(raw.muted),
      volume: Number.isFinite(volume) ? volume : 1,
    });
    videoByTrack.set(track, list);
  }

  const tracks: Timeline['tracks'] = [];

  for (const trackIndex of [...videoByTrack.keys()].sort((a, b) => a - b)) {
    tracks.push({
      id: `video-${trackIndex}`,
      type: 'video',
      clips: videoByTrack.get(trackIndex) ?? [],
    });
  }

  for (const trackIndex of [...audioByTrack.keys()].sort((a, b) => a - b)) {
    tracks.push({
      id: `audio-${trackIndex}`,
      type: 'audio',
      clips: audioByTrack.get(trackIndex) ?? [],
    });
  }

  return parseTimeline({
    version: 1,
    width: dims.width,
    height: dims.height,
    fps: opts.fps,
    background: '#000000',
    tracks,
  });
}

function resolveCanvasSize(
  snapshot: Record<string, unknown>,
  resolution: ExportResolution,
): { width: number; height: number } {
  if (resolution !== 'original') {
    return RESOLUTION_DIMS[resolution];
  }

  const width = Number(snapshot.width ?? snapshot.canvasWidth ?? 1920);
  const height = Number(snapshot.height ?? snapshot.canvasHeight ?? 1080);
  return {
    width: width > 0 ? Math.round(width) : 1920,
    height: height > 0 ? Math.round(height) : 1080,
  };
}
