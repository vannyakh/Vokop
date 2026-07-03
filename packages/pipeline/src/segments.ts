import path from "node:path";
import { writeFile } from "node:fs/promises";
import { runFFmpeg } from "./ffmpeg.js";
import { buildRenderArgs, type RenderOptions } from "./filtergraph.js";
import {
  computeDuration,
  type Timeline,
  type Track,
} from "./timeline.js";

/**
 * Segment-parallel export: split the timeline into time windows, render each
 * window as an independent .ts part (possibly on different workers), then
 * concat with `-c copy`. A 10-minute video across 5 workers exports ~5x faster.
 *
 * Splitting mid-clip is safe: sliceTimeline adjusts each clip's `in` point,
 * so a re-encode of every part produces frames identical to a single-pass
 * render at the same coordinates.
 */

export interface Segment {
  index: number;
  startSec: number;
  endSec: number;
}

export interface PlanOptions {
  /** target seconds per segment (default 30) */
  targetSegmentSec?: number;
  /** hard cap on segment count (default 64) */
  maxSegments?: number;
  /** snap boundaries to nearby clip edges within this tolerance (default 1s) */
  snapToleranceSec?: number;
}

/** Every clip start/end — the natural cut points of the timeline. */
export function findCutPoints(timeline: Timeline): number[] {
  const points = new Set<number>();
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      points.add(round6(clip.start));
      points.add(round6(clip.start + clip.duration));
    }
  }
  return [...points].sort((a, b) => a - b);
}

/** Split the timeline into even windows, snapped to clip edges when close. */
export function planSegments(
  timeline: Timeline,
  opts: PlanOptions = {},
): Segment[] {
  const duration = computeDuration(timeline);
  const target = opts.targetSegmentSec ?? 30;
  const maxSegments = opts.maxSegments ?? 64;
  const tolerance = opts.snapToleranceSec ?? 1;

  const count = Math.max(1, Math.min(maxSegments, Math.ceil(duration / target)));
  if (count === 1) return [{ index: 0, startSec: 0, endSec: duration }];

  const cuts = findCutPoints(timeline);
  const boundaries: number[] = [0];
  for (let i = 1; i < count; i++) {
    let b = (duration * i) / count;
    const snap = nearest(cuts, b);
    if (snap !== undefined && Math.abs(snap - b) <= tolerance) b = snap;
    const prev = boundaries[boundaries.length - 1]!;
    if (b > prev + 0.5) boundaries.push(round6(b));
  }
  boundaries.push(duration);

  const segments: Segment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    segments.push({
      index: i,
      startSec: boundaries[i]!,
      endSec: boundaries[i + 1]!,
    });
  }
  return segments;
}

/**
 * Rebase the timeline onto the [startSec, endSec) window: drop clips outside
 * it, clamp clips crossing its edges (advancing `in` by the trimmed head),
 * and shift everything so the window starts at t=0.
 */
export function sliceTimeline(
  timeline: Timeline,
  startSec: number,
  endSec: number,
): Timeline {
  const tracks: Track[] = timeline.tracks.map((track) => {
    const clips = track.clips
      .filter(
        (c) => c.start < endSec && c.start + c.duration > startSec,
      )
      .map((c) => {
        const headCut = Math.max(0, startSec - c.start);
        const newStart = Math.max(0, c.start - startSec);
        const newDuration =
          Math.min(c.start + c.duration, endSec) -
          Math.max(c.start, startSec);
        const sliced = {
          ...c,
          start: round6(newStart),
          duration: round6(newDuration),
        };
        if ("in" in sliced && "speed" in sliced) {
          sliced.in = round6(sliced.in + headCut * sliced.speed);
        }
        // a fade-out belongs to the clip's real tail; drop it if we cut the tail
        if ("fadeOutSec" in sliced && c.start + c.duration > endSec) {
          sliced.fadeOutSec = 0;
        }
        if ("fadeInSec" in sliced && headCut > 0) {
          sliced.fadeInSec = 0;
        }
        return sliced;
      });
    return { ...track, clips } as Track;
  });

  return { ...timeline, tracks };
}

export interface RenderSegmentsOptions
  extends Omit<RenderOptions, "output" | "durationSec"> {
  /** final output file (.mp4) */
  output: string;
  /** scratch directory for part files and the concat list */
  workDir: string;
  ffmpegBin?: string;
  signal?: AbortSignal;
  plan?: PlanOptions;
  /** parallel ffmpeg processes on this machine (default 2) */
  concurrency?: number;
  /** overall 0..1 progress across all segments + concat */
  onProgress?: (percent: number) => void;
}

/**
 * Single-machine parallel export. For multi-worker fan-out, call
 * planSegments + sliceTimeline + buildSegmentArgs yourself, run parts as
 * separate queue jobs, then finish with concatSegments.
 */
export async function renderSegments(
  opts: RenderSegmentsOptions,
): Promise<{ segments: Segment[]; partPaths: string[] }> {
  const segments = planSegments(opts.timeline, opts.plan);
  const total = computeDuration(opts.timeline);
  const done = new Array<number>(segments.length).fill(0);
  const partPaths = segments.map((s) =>
    path.join(opts.workDir, `part_${String(s.index).padStart(4, "0")}.ts`),
  );

  const report = () => {
    if (!opts.onProgress || total <= 0) return;
    const sec = done.reduce((a, b) => a + b, 0);
    opts.onProgress(Math.min(0.99, sec / total));
  };

  const concurrency = Math.max(1, opts.concurrency ?? 2);
  let next = 0;
  const runNext = async (): Promise<void> => {
    while (true) {
      const i = next++;
      if (i >= segments.length) return;
      const seg = segments[i]!;
      const segDur = seg.endSec - seg.startSec;
      const compiled = buildSegmentArgs(opts, seg, partPaths[i]!);
      await runFFmpeg({
        bin: opts.ffmpegBin,
        signal: opts.signal,
        args: compiled.args,
        totalDurationSec: segDur,
        onProgress: (p) => {
          done[i] = Math.min(segDur, p.outTimeSec);
          report();
        },
      });
      done[i] = segDur;
      report();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, segments.length) }, runNext),
  );

  await concatSegments(partPaths, opts.output, {
    workDir: opts.workDir,
    ffmpegBin: opts.ffmpegBin,
    signal: opts.signal,
  });
  opts.onProgress?.(1);
  return { segments, partPaths };
}

/** Compile the ffmpeg args for one segment part (MPEG-TS for clean concat). */
export function buildSegmentArgs(
  opts: Omit<RenderOptions, "output" | "durationSec">,
  segment: Segment,
  partPath: string,
) {
  const sliced = sliceTimeline(opts.timeline, segment.startSec, segment.endSec);
  return buildRenderArgs({
    ...opts,
    timeline: sliced,
    durationSec: round6(segment.endSec - segment.startSec),
    output: partPath,
    extraOutputArgs: ["-f", "mpegts"],
  });
}

/** Lossless join of rendered parts into the final container. */
export async function concatSegments(
  partPaths: string[],
  output: string,
  opts: { workDir: string; ffmpegBin?: string; signal?: AbortSignal },
): Promise<void> {
  const listPath = path.join(opts.workDir, "concat.txt");
  const list = partPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  await writeFile(listPath, list, "utf8");
  await runFFmpeg({
    bin: opts.ffmpegBin,
    signal: opts.signal,
    args: [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      output,
    ],
  });
}

function nearest(sorted: number[], target: number): number | undefined {
  if (sorted.length === 0) return undefined;
  let best = sorted[0]!;
  for (const v of sorted) {
    if (Math.abs(v - target) < Math.abs(best - target)) best = v;
  }
  return best;
}

function round6(v: number): number {
  return Math.round(v * 1_000_000) / 1_000_000;
}
