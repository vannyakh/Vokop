export interface PeakEntry {
  peaks: Float32Array;
  duration: number;
}

export interface AudioPeaksOptions {
  file?: File | null;
  /** Source is a video container — prefer ffmpeg decode for full-length audio. */
  isVideoSource?: boolean;
  expectedDuration?: number;
}

const peakCache = new Map<string, PeakEntry>();
const inflight = new Map<string, Promise<PeakEntry>>();

// High-resolution peak buffer: 32k samples for fine detail when zoomed in
const DEFAULT_SAMPLES = 32768;

/** Prefer ffmpeg when the file is large or a video container. */
const FFMPEG_PEAKS_MIN_BYTES = 32 * 1024 * 1024;

/** Soft cap — bar slots expand to fill width when clip is wider than this. */
export const MAX_WAVEFORM_DRAW_BARS = 12288;

/** Browser canvas dimension safety (avoid blank/white bitmap when zoomed in). */
export const MAX_WAVEFORM_CANVAS_PX = 8192;

export type WaveformDrawStyle = 'audio' | 'sound' | 'video';

export const WAVEFORM_TRACK_BG: Record<WaveformDrawStyle, string> = {
  audio: '#030e0c',
  sound: '#0a0f0c',
  video: '#0a0a0a',
};

/** Bar buckets for a clip canvas width (more bars when zoomed in). */
export function computeWaveformBarCount(canvasPx: number, style: WaveformDrawStyle = 'audio'): number {
  const min = 48;
  const max = style === 'video' ? MAX_WAVEFORM_DRAW_BARS : 16384;
  const pxPerBar = style === 'video' ? 1 : 1;
  const target = Math.ceil(canvasPx / pxPerBar);
  return Math.min(max, Math.max(min, target));
}

function peaksFromAudioBuffer(audioBuffer: AudioBuffer, samples = DEFAULT_SAMPLES): PeakEntry {
  const channelCount = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const blockSize = Math.max(1, Math.floor(length / samples));
  const peaks = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, length);
    let max = 0;
    for (let ch = 0; ch < channelCount; ch++) {
      const channel = audioBuffer.getChannelData(ch);
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channel[j] ?? 0));
      }
    }
    peaks[i] = max;
  }

  return { peaks, duration: audioBuffer.duration };
}

async function decodePeaksFromFile(file: File, samples = DEFAULT_SAMPLES): Promise<PeakEntry> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return peaksFromAudioBuffer(audioBuffer, samples);
  } finally {
    void ctx.close();
  }
}

async function decodePeaksFromUrl(url: string, samples = DEFAULT_SAMPLES): Promise<PeakEntry> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return peaksFromAudioBuffer(audioBuffer, samples);
  } finally {
    void ctx.close();
  }
}

function shouldPreferFfmpegPeaks(file: File, isVideoSource?: boolean): boolean {
  if (isVideoSource) return true;
  if (file.type.startsWith('video/')) return true;
  return file.size >= FFMPEG_PEAKS_MIN_BYTES;
}

function isTruncatedPeaks(entry: PeakEntry, expectedDuration?: number): boolean {
  if (!expectedDuration || expectedDuration <= 0 || entry.duration <= 0) return false;
  return entry.duration < expectedDuration * 0.85;
}

async function decodePeaksWithFallback(
  url: string,
  options?: AudioPeaksOptions,
): Promise<PeakEntry> {
  const { file, isVideoSource, expectedDuration } = options ?? {};
  const samples = DEFAULT_SAMPLES;

  if (file) {
    const { extractWaveformPeaksFromFile } = await import('@/features/studio/lib/ffmpeg');

    if (shouldPreferFfmpegPeaks(file, isVideoSource)) {
      try {
        const ffmpegPeaks = await extractWaveformPeaksFromFile(file, samples);
        if (ffmpegPeaks.duration > 0) return ffmpegPeaks;
      } catch {
        // fall through to AudioContext
      }
    }

    try {
      const entry = await decodePeaksFromFile(file, samples);
      if (!isTruncatedPeaks(entry, expectedDuration)) return entry;
    } catch {
      // fall through to ffmpeg
    }

    try {
      const ffmpegPeaks = await extractWaveformPeaksFromFile(file, samples);
      if (ffmpegPeaks.duration > 0) return ffmpegPeaks;
    } catch {
      // fall through to URL fetch
    }
  }

  const fromUrl = await decodePeaksFromUrl(url, samples);
  if (!isTruncatedPeaks(fromUrl, expectedDuration)) return fromUrl;

  if (file) {
    const { extractWaveformPeaksFromFile } = await import('@/features/studio/lib/ffmpeg');
    const ffmpegPeaks = await extractWaveformPeaksFromFile(file, samples);
    if (ffmpegPeaks.duration > 0) return ffmpegPeaks;
  }

  return fromUrl;
}

export async function getAudioPeaks(
  key: string,
  url: string,
  options?: AudioPeaksOptions,
): Promise<PeakEntry> {
  const cached = peakCache.get(key);
  if (cached && !isTruncatedPeaks(cached, options?.expectedDuration)) return cached;
  if (cached) peakCache.delete(key);

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = decodePeaksWithFallback(url, options)
    .then((entry) => {
      peakCache.set(key, entry);
      inflight.delete(key);
      return entry;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, task);
  return task;
}

export function getCachedAudioPeaks(key: string): PeakEntry | undefined {
  return peakCache.get(key);
}

/** Resample peak slice for clip trim + pixel width. */
export function peaksForClipRegion(
  peaks: Float32Array,
  mediaDuration: number,
  sourceStart: number,
  clipDuration: number,
  barCount: number,
): Float32Array {
  if (barCount <= 0 || mediaDuration <= 0 || peaks.length === 0) {
    return new Float32Array(0);
  }

  const startSec = Math.max(0, sourceStart);
  const endSec = Math.min(mediaDuration, startSec + Math.max(clipDuration, 0.01));
  const startIdx = Math.floor((startSec / mediaDuration) * peaks.length);
  const endIdx = Math.max(startIdx + 1, Math.ceil((endSec / mediaDuration) * peaks.length));
  const slice = peaks.subarray(startIdx, endIdx);

  if (slice.length === barCount) return Float32Array.from(slice);

  const out = new Float32Array(barCount);
  for (let i = 0; i < barCount; i++) {
    const t0 = i / barCount;
    const t1 = (i + 1) / barCount;
    const i0 = Math.min(slice.length - 1, Math.floor(t0 * slice.length));
    const i1 = Math.max(i0 + 1, Math.min(slice.length, Math.ceil(t1 * slice.length)));
    let max = 0;
    for (let j = i0; j < i1; j++) {
      max = Math.max(max, slice[j] ?? 0);
    }
    out[i] = max;
  }
  return out;
}

/** Visible slice of a wide clip — keeps canvas under browser size limits when zoomed in. */
export function resolveWaveformViewport(
  clipWidthPx: number,
  _clipLeftPx: number,
  _timelineScrollLeft: number,
  _timelineClientWidth: number,
  devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1,
): { startPx: number; widthPx: number } | null {
  const fullCanvasPx = Math.floor(clipWidthPx * devicePixelRatio);
  if (fullCanvasPx <= MAX_WAVEFORM_CANVAS_PX || clipWidthPx <= 0) return null;

  // One downsampled bitmap spans the full clip — avoids empty gaps when scrolled.
  return null;
}
export function normalizeWaveformPeaks(peaks: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < peaks.length; i++) {
    max = Math.max(max, peaks[i] ?? 0);
  }
  if (max <= 1e-6) return peaks;
  const out = new Float32Array(peaks.length);
  for (let i = 0; i < peaks.length; i++) {
    out[i] = (peaks[i] ?? 0) / max;
  }
  return out;
}

export const WAVEFORM_HIGH_PEAK = 0.62;
export const WAVEFORM_CLIP_PEAK = 0.82;

export interface WaveformColors {
  fill: string;
  bg?: string;
  glow?: string;
  hot?: string;
  clip?: string;
}

export function drawTimelineWaveform(
  canvas: HTMLCanvasElement,
  peaks: Float32Array,
  colors: WaveformColors,
  style: WaveformDrawStyle = 'audio',
): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const w = canvas.width;
  const h = canvas.height;
  const mid = Math.round(h / 2);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = colors.bg ?? WAVEFORM_TRACK_BG[style];
  ctx.fillRect(0, 0, w, h);

  if (peaks.length === 0) return false;

  const displayPeaks = normalizeWaveformPeaks(peaks);

  const hScale = Math.max(0.85, Math.min(1.75, h / 72));
  const isSound = style === 'sound';
  const pillBarPx = (isSound ? 2.25 : style === 'video' ? 1.25 : 1.5) * hScale;
  const totalBars = displayPeaks.length;
  const slotW = totalBars > 0 ? w / totalBars : w;
  const useContinuous = slotW <= 1.8 && totalBars >= 64;
  const MIN_AMP = Math.max(isSound ? 2 : 1.5, h * (isSound ? 0.045 : 0.03));
  const ampScale = isSound ? 0.98 : 0.95;
  const hotFill = colors.hot ?? 'rgba(251, 146, 60, 0.98)';
  const clipFill = colors.clip ?? 'rgba(239, 68, 68, 0.98)';

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  if (isSound) {
    grad.addColorStop(0, colorWithAlpha(colors.fill, 0.68));
    grad.addColorStop(0.35, colorWithAlpha(colors.fill, 0.92));
    grad.addColorStop(0.65, colorWithAlpha(colors.fill, 1));
    grad.addColorStop(1, colorWithAlpha(colors.fill, 0.72));
  } else {
    grad.addColorStop(0, colorWithAlpha(colors.fill, 0.72));
    grad.addColorStop(0.5, colorWithAlpha(colors.fill, 1));
    grad.addColorStop(1, colorWithAlpha(colors.fill, 0.8));
  }

  const defaultBarW = useContinuous
    ? Math.max(1, slotW)
    : isSound && slotW > pillBarPx * 2
      ? Math.min(pillBarPx, slotW * 0.78)
      : Math.max(1, slotW * 0.92);

  const barGeometry: { x: number; top: number; ht: number; barW: number; raw: number }[] = [];
  for (let i = 0; i < totalBars; i++) {
    const raw = displayPeaks[i] ?? 0;
    const amp = Math.max(MIN_AMP, raw * (mid - 1) * ampScale);
    const bw = defaultBarW;
    barGeometry.push({
      x: i * slotW + (slotW - bw) * 0.5,
      top: mid - amp,
      ht: amp * 2,
      barW: bw,
      raw,
    });
  }

  const drawContinuousEnvelope = (
    filter: (raw: number) => boolean,
    fill: CanvasGradient | string,
    alpha: number,
  ) => {
    if (totalBars < 2) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    for (let i = 0; i < totalBars; i++) {
      const raw = displayPeaks[i] ?? 0;
      const amp = filter(raw) ? Math.max(MIN_AMP, raw * (mid - 1) * ampScale) : 0;
      ctx.lineTo(i * slotW + slotW * 0.5, mid - amp);
    }
    for (let i = totalBars - 1; i >= 0; i--) {
      const raw = displayPeaks[i] ?? 0;
      const amp = filter(raw) ? Math.max(MIN_AMP, raw * (mid - 1) * ampScale) : 0;
      ctx.lineTo(i * slotW + slotW * 0.5, mid + amp);
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawBarBatch = (
    filter: (raw: number) => boolean,
    fill: CanvasGradient | string,
    alpha: number,
    widthMul: number,
    ampMul: number,
    useRound: boolean,
  ) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (const bar of barGeometry) {
      if (!filter(bar.raw)) continue;
      const amp = Math.max(MIN_AMP * ampMul, bar.raw * (mid - 1) * ampScale * ampMul);
      const top = mid - amp;
      const ht = amp * 2;
      const barW = bar.barW * widthMul;
      if (useRound && typeof ctx.roundRect === 'function') {
        ctx.roundRect(bar.x, top, barW, ht, barW * 0.45);
      } else {
        ctx.rect(bar.x, top, barW, ht);
      }
    }
    ctx.fill();
  };

  if (isSound && colors.glow) {
    ctx.fillStyle = colors.glow;
    ctx.fillRect(0, 0, w, h);
    if (useContinuous) {
      drawContinuousEnvelope(() => true, grad, 0.42);
    } else {
      drawBarBatch(() => true, grad, 0.42, 2.4, 1.12, true);
    }
  }

  if (useContinuous) {
    drawContinuousEnvelope((raw) => raw < WAVEFORM_HIGH_PEAK, grad, 1);
    drawContinuousEnvelope(
      (raw) => raw >= WAVEFORM_HIGH_PEAK && raw < WAVEFORM_CLIP_PEAK,
      hotFill,
      1,
    );
    drawContinuousEnvelope((raw) => raw >= WAVEFORM_CLIP_PEAK, clipFill, 1);
  } else {
    drawBarBatch(
      (raw) => raw < WAVEFORM_HIGH_PEAK,
      grad,
      1,
      1,
      1,
      isSound,
    );
    drawBarBatch(
      (raw) => raw >= WAVEFORM_HIGH_PEAK && raw < WAVEFORM_CLIP_PEAK,
      hotFill,
      1,
      1,
      1.04,
      isSound,
    );
    drawBarBatch(
      (raw) => raw >= WAVEFORM_CLIP_PEAK,
      clipFill,
      1,
      1.08,
      1.08,
      isSound,
    );
  }

  ctx.globalAlpha = isSound ? 0.12 : 0.18;
  ctx.fillStyle = colors.fill;
  ctx.fillRect(0, mid - 0.5, w, 1);
  ctx.globalAlpha = 1;
  return true;
}

/**
 * Parse a fill color string (rgba / hex / hsl) and return it with overridden alpha.
 */
function colorWithAlpha(color: string, alpha: number): string {
  const rgba = color.match(/^rgba?\((.+)\)$/i);
  if (rgba) {
    const parts = rgba[1]!.split(',').map((s) => s.trim());
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha.toFixed(3)})`;
    }
  }
  const hex = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    }
  }
  return color;
}
