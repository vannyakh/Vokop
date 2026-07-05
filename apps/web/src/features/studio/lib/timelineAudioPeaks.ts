interface PeakEntry {
  peaks: Float32Array;
  duration: number;
}

const peakCache = new Map<string, PeakEntry>();
const inflight = new Map<string, Promise<PeakEntry>>();

// High-resolution peak buffer: 16k samples gives crisp waveforms at any zoom/clip width
const DEFAULT_SAMPLES = 16384;

async function decodePeaksFromUrl(url: string, samples = DEFAULT_SAMPLES): Promise<PeakEntry> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const length = channel.length;
    const blockSize = Math.max(1, Math.floor(length / samples));
    const peaks = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, length);
      let max = 0;
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channel[j] ?? 0));
      }
      peaks[i] = max;
    }

    return { peaks, duration: audioBuffer.duration };
  } finally {
    void ctx.close();
  }
}

export async function getAudioPeaks(key: string, url: string): Promise<PeakEntry> {
  const cached = peakCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = decodePeaksFromUrl(url)
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
    const t = i / barCount;
    const srcIdx = Math.min(slice.length - 1, Math.floor(t * slice.length));
    out[i] = slice[srcIdx] ?? 0;
  }
  return out;
}

export function drawTimelineWaveform(
  canvas: HTMLCanvasElement,
  peaks: Float32Array,
  colors: { fill: string; bg?: string },
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const mid = Math.round(h / 2);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (peaks.length === 0) return;

  // ── Global horizontal gradient across full waveform width ──
  // Mimics CapCut / Logic Pro waveform coloring: uniform bright teal from left to right
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0,   colorWithAlpha(colors.fill, 0.72));
  grad.addColorStop(0.5, colorWithAlpha(colors.fill, 1.0));
  grad.addColorStop(1,   colorWithAlpha(colors.fill, 0.80));

  // ── Ultra-thin bars: 1.5 canvas-px wide, 0.5 canvas-px gap ──
  // This produces the dense "audio signal" look regardless of bar count
  const BAR_PX  = 1.5;   // canvas pixels per bar
  const GAP_PX  = 0.5;   // gap between bars
  const STEP_PX = BAR_PX + GAP_PX;

  const totalBars = peaks.length;

  // Map each bar to its canvas x position
  const xStep = w / totalBars;

  // Minimum height so silent areas still show a hairline
  const MIN_AMP = Math.max(1.5, h * 0.03);

  ctx.fillStyle = grad;

  // Batch all bars into a single path for maximum performance
  ctx.beginPath();
  for (let i = 0; i < totalBars; i++) {
    const raw = peaks[i] ?? 0;
    const amp = Math.max(MIN_AMP, raw * (mid - 1) * 0.95);
    const x   = i * xStep;
    const top = mid - amp;
    const ht  = amp * 2;

    // Use rect() inside path — renders as one batched GPU draw call
    ctx.rect(x, top, BAR_PX, ht);
  }
  ctx.fill();

  // ── Center baseline ──
  ctx.globalAlpha = 0.18;
  ctx.fillStyle   = colors.fill;
  ctx.fillRect(0, mid - 0.5, w, 1);
  ctx.globalAlpha = 1;
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
