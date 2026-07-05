interface PeakEntry {
  peaks: Float32Array;
  duration: number;
}

const peakCache = new Map<string, PeakEntry>();
const inflight = new Map<string, Promise<PeakEntry>>();

const DEFAULT_SAMPLES = 4096;

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

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (colors.bg) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
  }

  if (peaks.length === 0) return;

  const mid = h / 2;
  const gap = 0.5;
  const barW = Math.max(1, w / peaks.length);

  ctx.fillStyle = colors.fill;

  for (let i = 0; i < peaks.length; i++) {
    const amp = Math.max(0.04, peaks[i]!) * mid * 0.92;
    const x = i * barW;
    const barWidth = Math.max(1, barW - gap);
    ctx.fillRect(x, mid - amp, barWidth, amp * 2);
  }
}
