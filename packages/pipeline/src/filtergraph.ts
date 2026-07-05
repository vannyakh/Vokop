import {
  computeDuration,
  type AudioClip,
  type EqBand,
  type TextClip,
  type Timeline,
  type VideoClip,
} from "./timeline.js";
import {
  areSequentialClips,
  buildXfadeChain,
  transitionsBetweenClips,
  type XfadeTransition,
} from "./xfade.js";

export type { XfadeTransition } from "./xfade.js";
export {
  buildXfadeChain,
  resolveXfadeName,
  transitionsBetweenClips,
  areSequentialClips,
  PRESET_TO_XFADE,
} from "./xfade.js";

export interface AssetMediaFlags {
  hasAudio?: boolean;
  hasVideo?: boolean;
}

export interface RenderOptions {
  timeline: Timeline;
  /** assetId -> local file path (originals for export, proxies for drafts) */
  assetPaths: Record<string, string>;
  /** assetId -> probed flags; lets the graph skip audio for silent videos */
  assetFlags?: Record<string, AssetMediaFlags>;
  output: string;
  video?: {
    codec?: string; // default libx264
    crf?: number; // default 18
    preset?: string; // default medium
    pixFmt?: string; // default yuv420p
  };
  audio?: {
    codec?: string; // default aac
    bitrate?: string; // default 192k
    sampleRate?: number; // default 48000
  };
  /** absolute path to a .ttf/.otf for drawtext; wins over style.fontFamily */
  fontFile?: string;
  /** container-level extras appended before the output path */
  extraOutputArgs?: string[];
  /** override output duration (used by segment rendering) */
  durationSec?: number;
  /** Cross-clip xfade transitions (sequential video track). */
  transitions?: XfadeTransition[];
}

export interface CompiledRender {
  args: string[];
  filterComplex: string;
  durationSec: number;
  inputCount: number;
}

interface InputRef {
  path: string;
  index: number;
}

export function buildRenderArgs(opts: RenderOptions): CompiledRender {
  const t = opts.timeline;
  const duration = opts.durationSec ?? computeDuration(t);
  if (duration <= 0) {
    throw new Error("timeline is empty — nothing to render");
  }

  const inputs: InputRef[] = [];
  const addInput = (p: string): number => {
    const index = inputs.length;
    inputs.push({ path: p, index });
    return index;
  };
  const assetPath = (assetId: string): string => {
    const p = opts.assetPaths[assetId];
    if (!p) throw new Error(`no file path provided for asset "${assetId}"`);
    return p;
  };

  const filters: string[] = [];
  const fps = t.fps;
  const W = t.width;
  const H = t.height;

  // --- canvas ---
  filters.push(
    `color=c=${ffColor(t.background)}:s=${W}x${H}:r=${fps}:d=${duration.toFixed(4)}[bg]`,
  );
  let cur = "bg";

  // --- video clips, bottom track first, chronological within a track ---
  const videoClips: VideoClip[] = [];
  for (const track of t.tracks) {
    if (track.type !== "video") continue;
    videoClips.push(
      ...[...track.clips].sort((a, b) => a.start - b.start),
    );
  }

  const sequentialRefs = videoClips.map((c) => ({
    id: c.id,
    startSec: c.start,
    durationSec: c.duration,
  }));
  const useXfade =
    videoClips.length > 1 &&
    opts.transitions?.length &&
    areSequentialClips(sequentialRefs);

  let vSeq = 0;
  if (useXfade) {
    const prepLabels: string[] = [];
    const prepDurations: number[] = [];
    for (const clip of videoClips) {
      const flags = opts.assetFlags?.[clip.assetId];
      if (flags?.hasVideo === false) continue;
      const idx = addInput(assetPath(clip.assetId));
      const label = `v${vSeq++}`;
      filters.push(videoClipChain(clip, idx, label, W, H, fps, { shiftPts: false }));
      prepLabels.push(label);
      prepDurations.push(clip.duration);
    }
    const clipIds = videoClips.map((c) => c.id);
    const pairTransitions = transitionsBetweenClips(clipIds, opts.transitions ?? []);
    const chain = buildXfadeChain({
      clipLabels: prepLabels,
      clipDurations: prepDurations,
      transitions: pairTransitions,
    });
    filters.push(...chain.filters);
    const shifted = `vx`;
    filters.push(`[${chain.outputLabel}]setpts=PTS+${num(videoClips[0]!.start)}/TB[${shifted}]`);
    const out = `c${vSeq}`;
    const end = videoClips[0]!.start + chain.outputDurationSec;
    filters.push(
      `[${cur}][${shifted}]overlay=x=(main_w-overlay_w)/2:y=(main_h-overlay_h)/2:` +
        `eof_action=pass:enable='between(t,${num(videoClips[0]!.start)},${num(end)})'[${out}]`,
    );
    cur = out;
  } else {
    for (const clip of videoClips) {
      const flags = opts.assetFlags?.[clip.assetId];
      if (flags?.hasVideo === false) continue;
      const idx = addInput(assetPath(clip.assetId));
      const label = `v${vSeq++}`;
      filters.push(videoClipChain(clip, idx, label, W, H, fps));
      const out = `c${vSeq}`;
      const end = clip.start + clip.duration;
      filters.push(
        `[${cur}][${label}]overlay=x=${overlayX(clip, W)}:y=${overlayY(clip, H)}:` +
          `eof_action=pass:enable='between(t,${num(clip.start)},${num(end)})'[${out}]`,
      );
      cur = out;
    }
  }

  // --- text clips ---
  const textClips: TextClip[] = [];
  for (const track of t.tracks) {
    if (track.type !== "text") continue;
    textClips.push(...track.clips);
  }
  if (textClips.length > 0) {
    const chain = textClips
      .map((clip) => drawtextFilter(clip, opts.fontFile))
      .join(",");
    filters.push(`[${cur}]${chain}[vtxt]`);
    cur = "vtxt";
  }

  const pixFmt = opts.video?.pixFmt ?? "yuv420p";
  filters.push(`[${cur}]format=${pixFmt}[vout]`);

  // --- audio ---
  const sampleRate = opts.audio?.sampleRate ?? 48000;
  const audioLabels: string[] = [];
  let aSeq = 0;

  // audio-track clips
  for (const track of t.tracks) {
    if (track.type !== "audio") continue;
    for (const clip of [...track.clips].sort((a, b) => a.start - b.start)) {
      if (opts.assetFlags?.[clip.assetId]?.hasAudio === false) continue;
      const idx = addInput(assetPath(clip.assetId));
      const label = `a${aSeq++}`;
      filters.push(audioClipChain(clip, idx, label, sampleRate));
      audioLabels.push(label);
    }
  }
  // embedded audio from unmuted video clips
  for (const clip of videoClips) {
    if (clip.muted || clip.volume <= 0) continue;
    if (opts.assetFlags?.[clip.assetId]?.hasAudio === false) continue;
    const idx = addInput(assetPath(clip.assetId));
    const label = `a${aSeq++}`;
    filters.push(
      audioClipChain(
        {
          id: clip.id,
          assetId: clip.assetId,
          start: clip.start,
          duration: clip.duration,
          in: clip.in,
          speed: clip.speed,
          volume: clip.volume,
          fadeInSec: 0,
          fadeOutSec: 0,
          eq: clip.eq,
        },
        idx,
        label,
        sampleRate,
      ),
    );
    audioLabels.push(label);
  }

  if (audioLabels.length === 0) {
    filters.push(
      `anullsrc=r=${sampleRate}:cl=stereo,atrim=0:${duration.toFixed(4)}[aout]`,
    );
  } else if (audioLabels.length === 1) {
    filters.push(
      `[${audioLabels[0]}]apad,atrim=0:${duration.toFixed(4)}[aout]`,
    );
  } else {
    filters.push(
      audioLabels.map((l) => `[${l}]`).join("") +
        `amix=inputs=${audioLabels.length}:duration=longest:normalize=0,` +
        `apad,atrim=0:${duration.toFixed(4)}[aout]`,
    );
  }

  const filterComplex = filters.join(";");

  const args: string[] = [];
  for (const input of inputs) args.push("-i", input.path);
  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-t",
    duration.toFixed(4),
    "-r",
    String(fps),
    "-c:v",
    opts.video?.codec ?? "libx264",
    "-crf",
    String(opts.video?.crf ?? 18),
    "-preset",
    opts.video?.preset ?? "medium",
    "-c:a",
    opts.audio?.codec ?? "aac",
    "-b:a",
    opts.audio?.bitrate ?? "192k",
    "-ar",
    String(sampleRate),
  );
  if (opts.extraOutputArgs) args.push(...opts.extraOutputArgs);
  else args.push("-movflags", "+faststart");
  args.push(opts.output);

  return { args, filterComplex, durationSec: duration, inputCount: inputs.length };
}

// ---------- video helpers ----------

function videoClipChain(
  clip: VideoClip,
  inputIndex: number,
  outLabel: string,
  W: number,
  H: number,
  fps: number,
  options?: { shiftPts?: boolean },
): string {
  const shiftPts = options?.shiftPts !== false;
  const srcConsumed = clip.duration * clip.speed;
  const steps: string[] = [];

  steps.push(
    `trim=start=${num(clip.in)}:end=${num(clip.in + srcConsumed)}`,
    `setpts=(PTS-STARTPTS)/${num(clip.speed)}`,
    `fps=${fps}`,
  );

  // fit into canvas, then user scale
  const s = clip.transform.scale;
  const tw = Math.round(W * s);
  const th = Math.round(H * s);
  switch (clip.fit) {
    case "contain":
      steps.push(
        `scale=${tw}:${th}:force_original_aspect_ratio=decrease`,
      );
      break;
    case "cover":
      steps.push(
        `scale=${tw}:${th}:force_original_aspect_ratio=increase`,
        `crop=${tw}:${th}`,
      );
      break;
    case "stretch":
      steps.push(`scale=${tw}:${th}`);
      break;
  }
  steps.push("setsar=1");

  if (clip.transform.rotation !== 0) {
    const rad = `${num((clip.transform.rotation * Math.PI) / 180)}`;
    steps.push(
      "format=yuva420p",
      `rotate=${rad}:c=none:ow=rotw(${rad}):oh=roth(${rad})`,
    );
  }

  const hasFade = clip.fadeInSec > 0 || clip.fadeOutSec > 0;
  if (clip.transform.opacity < 1 || hasFade) {
    steps.push(
      "format=yuva420p",
      `colorchannelmixer=aa=${num(clip.transform.opacity)}`,
    );
  }
  if (clip.fadeInSec > 0) {
    steps.push(`fade=t=in:st=0:d=${num(clip.fadeInSec)}:alpha=1`);
  }
  if (clip.fadeOutSec > 0) {
    steps.push(
      `fade=t=out:st=${num(Math.max(0, clip.duration - clip.fadeOutSec))}:d=${num(clip.fadeOutSec)}:alpha=1`,
    );
  }

  // shift frames into timeline position (skip when xfade chain handles placement)
  if (shiftPts) {
    steps.push(`setpts=PTS+${num(clip.start)}/TB`);
  }

  return `[${inputIndex}:v]${steps.join(",")}[${outLabel}]`;
}

function overlayX(clip: VideoClip, _W: number): string {
  return `(main_w-overlay_w)/2+${num(clip.transform.x)}`;
}
function overlayY(clip: VideoClip, _H: number): string {
  return `(main_h-overlay_h)/2+${num(clip.transform.y)}`;
}

// ---------- text helpers ----------

function drawtextFilter(clip: TextClip, fontFile?: string): string {
  const st = clip.style;
  const end = clip.start + clip.duration;
  const parts: string[] = [
    `text='${escapeDrawtext(clip.text)}'`,
    `fontsize=${st.fontSizePx}`,
    `fontcolor=${ffColor(st.color)}`,
    `x=(w-text_w)*${num(st.x)}`,
    `y=(h-text_h)*${num(st.y)}`,
    `enable='between(t,${num(clip.start)},${num(end)})'`,
  ];
  if (fontFile) parts.push(`fontfile='${escapeDrawtext(fontFile)}'`);
  else parts.push(`font='${escapeDrawtext(st.fontFamily)}'`);
  if (st.backgroundColor) {
    parts.push(
      "box=1",
      `boxcolor=${ffColor(st.backgroundColor)}@${num(st.backgroundOpacity)}`,
      "boxborderw=12",
    );
  }
  return `drawtext=${parts.join(":")}`;
}

/**
 * Escape text for drawtext inside a filter_complex passed as one argv element
 * (no shell). Backslash + colon + percent are drawtext-level escapes; the
 * single quote closes/reopens filtergraph quoting.
 */
export function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/'/g, "'\\''");
}

// ---------- audio helpers ----------

function audioClipChain(
  clip: AudioClip,
  inputIndex: number,
  outLabel: string,
  sampleRate: number,
): string {
  const srcConsumed = clip.duration * clip.speed;
  const steps: string[] = [
    `atrim=start=${num(clip.in)}:end=${num(clip.in + srcConsumed)}`,
    "asetpts=PTS-STARTPTS",
    ...atempoChain(clip.speed),
    `aresample=${sampleRate}`,
    "aformat=channel_layouts=stereo",
  ];
  if (clip.volume !== 1) steps.push(`volume=${num(clip.volume)}`);
  if (clip.eq?.enabled) steps.push(...eqFilterChain(clip.eq.bands));
  if (clip.fadeInSec > 0)
    steps.push(`afade=t=in:st=0:d=${num(clip.fadeInSec)}`);
  if (clip.fadeOutSec > 0)
    steps.push(
      `afade=t=out:st=${num(Math.max(0, clip.duration - clip.fadeOutSec))}:d=${num(clip.fadeOutSec)}`,
    );
  const delayMs = Math.round(clip.start * 1000);
  if (delayMs > 0) steps.push(`adelay=${delayMs}:all=1`);
  return `[${inputIndex}:a]${steps.join(",")}[${outLabel}]`;
}

/**
 * FFmpeg filter chain for one clip's enabled EQ bands, in band order.
 * `highpass`/`lowpass` are pure filters (no gain); `lowshelf`/`highshelf` map
 * to ffmpeg's `bass`/`treble` shelving filters; `peaking` maps to `equalizer`.
 * All accept `width_type=q:w=<Q>` for consistency with the studio's curve math.
 */
export function eqFilterChain(bands: EqBand[]): string[] {
  return bands
    .filter((b) => b.enabled)
    .map((b) => {
      const f = num(b.freq);
      const q = num(b.q);
      switch (b.type) {
        case "highpass":
          return `highpass=f=${f}:width_type=q:w=${q}`;
        case "lowpass":
          return `lowpass=f=${f}:width_type=q:w=${q}`;
        case "lowshelf":
          return `bass=g=${num(b.gainDb)}:f=${f}:width_type=q:w=${q}`;
        case "highshelf":
          return `treble=g=${num(b.gainDb)}:f=${f}:width_type=q:w=${q}`;
        case "peaking":
        default:
          return `equalizer=f=${f}:width_type=q:w=${q}:g=${num(b.gainDb)}`;
      }
    });
}

/** atempo only accepts 0.5..2.0 per instance — chain factors for the rest. */
export function atempoChain(speed: number): string[] {
  if (speed === 1) return [];
  const steps: string[] = [];
  let remaining = speed;
  while (remaining > 2) {
    steps.push("atempo=2.0");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    steps.push("atempo=0.5");
    remaining /= 0.5;
  }
  steps.push(`atempo=${num(remaining)}`);
  return steps;
}

// ---------- misc ----------

/** '#RRGGBB' -> '0xRRGGBB' (ffmpeg color syntax) */
export function ffColor(hex: string): string {
  return hex.startsWith("#") ? `0x${hex.slice(1)}` : hex;
}

/** stable, locale-safe number formatting for filter strings */
function num(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 1_000_000) / 1_000_000);
}
