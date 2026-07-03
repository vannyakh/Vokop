/**
 * Timeline JSON → FFmpeg filter_complex string.
 *
 * Takes a simplified timeline snapshot (clips on tracks) and emits the
 * filter_complex + input/output map needed to render a final video.
 */

export type ClipKind = 'video' | 'audio' | 'image' | 'text' | 'caption';

export interface TimelineClip {
  id: string;
  kind: ClipKind;
  /** R2 object key or local path */
  src: string;
  /** Timeline position in seconds */
  startAtSec: number;
  /** Source in-point in seconds */
  inPointSec: number;
  /** Duration (after trim) in seconds */
  durationSec: number;
  /** Track index */
  track: number;
  /** Applied CSS/FFmpeg filter id */
  filterId?: string;
  /** Applied FFmpeg filter expression (resolved from filterId) */
  ffmpegFilter?: string;
  /** Volume (0–2, default 1.0) */
  volume?: number;
}

export interface FiltergraphOptions {
  clips: TimelineClip[];
  canvasWidth: number;
  canvasHeight: number;
  fps: number;
  durationSec: number;
}

export interface FiltergraphResult {
  /** -i <file> entries for ffmpeg command */
  inputs: string[];
  /** filter_complex string */
  filterComplex: string;
  /** -map [label] for the final video stream */
  videoMap: string;
  /** -map [label] for the final audio stream (null if no audio) */
  audioMap: string | null;
}

/**
 * Build FFmpeg inputs + filter_complex from a timeline snapshot.
 * Supports: overlay clips (video/image), audio mix, per-clip filters.
 */
export function buildFiltergraph(opts: FiltergraphOptions): FiltergraphResult {
  const { clips, canvasWidth, canvasHeight, fps, durationSec } = opts;

  const inputs: string[] = [];
  const filters: string[] = [];
  let inputIndex = 0;

  // Base black canvas
  filters.push(
    `color=c=black:s=${canvasWidth}x${canvasHeight}:r=${fps}:d=${durationSec}[base]`,
  );

  const videoClips = clips.filter((c) => c.kind === 'video' || c.kind === 'image');
  const audioClips = clips.filter((c) => c.kind === 'video' || c.kind === 'audio');

  let prevLabel = 'base';

  // ─── Video / image tracks ────────────────────────────────────────────────
  for (let i = 0; i < videoClips.length; i++) {
    const clip = videoClips[i];
    const idx = inputIndex++;
    inputs.push(clip.src);

    const trimLabel = `v${i}trim`;
    const scaledLabel = `v${i}sc`;
    const overlayLabel = `v${i}ov`;

    // Trim + setpts
    filters.push(
      `[${idx}:v]` +
      `trim=start=${clip.inPointSec}:duration=${clip.durationSec},` +
      `setpts=PTS-STARTPTS+${clip.startAtSec}/TB` +
      (clip.ffmpegFilter ? `,${clip.ffmpegFilter}` : '') +
      `[${trimLabel}]`,
    );

    // Scale to canvas
    filters.push(
      `[${trimLabel}]scale=${canvasWidth}:${canvasHeight}:force_original_aspect_ratio=decrease,` +
      `pad=${canvasWidth}:${canvasHeight}:(ow-iw)/2:(oh-ih)/2[${scaledLabel}]`,
    );

    // Overlay onto previous layer
    filters.push(
      `[${prevLabel}][${scaledLabel}]overlay=shortest=0[${overlayLabel}]`,
    );
    prevLabel = overlayLabel;
  }

  const videoMap = `[${prevLabel}]`;

  // ─── Audio tracks ────────────────────────────────────────────────────────
  let audioMap: string | null = null;
  if (audioClips.length > 0) {
    const audioLabels: string[] = [];

    for (let i = 0; i < audioClips.length; i++) {
      const clip = audioClips[i];
      // Find if this clip already has an input index from the video loop
      const existingIdx = videoClips.findIndex((c) => c.id === clip.id);
      const idx = existingIdx >= 0 ? existingIdx : inputIndex++;
      if (existingIdx < 0) inputs.push(clip.src);

      const aLabel = `a${i}mix`;
      const volume = clip.volume ?? 1;
      filters.push(
        `[${idx}:a]` +
        `atrim=start=${clip.inPointSec}:duration=${clip.durationSec},` +
        `asetpts=PTS-STARTPTS,` +
        `adelay=${Math.round(clip.startAtSec * 1000)}:all=1,` +
        `volume=${volume}` +
        `[${aLabel}]`,
      );
      audioLabels.push(`[${aLabel}]`);
    }

    const mixLabel = 'amix_out';
    filters.push(
      `${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=longest[${mixLabel}]`,
    );
    audioMap = `[${mixLabel}]`;
  }

  return {
    inputs,
    filterComplex: filters.join(';'),
    videoMap,
    audioMap,
  };
}
