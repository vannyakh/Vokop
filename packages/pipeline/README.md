# @vokop/pipeline

Shared FFmpeg pipeline for Vokop. One codebase compiles timeline JSON into
deterministic ffmpeg commands, so the cloud render workers
(`services/video-tools`) and the Electron desktop app produce identical output.

Pure TypeScript + `node:child_process`. Only runtime dependency: `zod`.
Requires ffmpeg/ffprobe binaries (system, docker image, or bundled in Electron —
pass paths via the `ffmpegBin` / `ffprobeBin` options).

## Modules

| Module | Purpose |
| --- | --- |
| `timeline` | zod schema for the CapCut-style timeline — the shared contract |
| `probe` | ffprobe → normalized `MediaInfo` (duration, streams, rotation) |
| `proxy` | ingest step: 720p proxy, thumbnails, waveform peaks JSON |
| `filtergraph` | timeline JSON → complete ffmpeg argv (`buildRenderArgs`) |
| `segments` | split timeline, render parts in parallel, lossless concat |
| `ffmpeg` | spawn wrapper with `-progress` parsing and AbortSignal support |
| `tmp` | scratch dir lifecycle per job |

## Usage

### Ingest (cloud ingest.worker / desktop import)

```ts
import { ingestAsset } from "@vokop/pipeline";

const result = await ingestAsset("/uploads/raw.mp4", "/scratch/asset123", {
  onProgress: (p) => job.updateProgress(p.percent * 100),
});
// result.info          -> MediaInfo (store on the asset document)
// result.proxyPath     -> upload to R2 as assets/{id}/proxy.mp4
// result.thumbnailPaths, result.waveformPath
```

### Single-pass export

```ts
import { parseTimeline, buildRenderArgs, runFFmpeg } from "@vokop/pipeline";

const timeline = parseTimeline(job.data.timelineSnapshot);
const compiled = buildRenderArgs({
  timeline,
  assetPaths: { asset123: "/scratch/asset123.mp4" },
  output: "/scratch/final.mp4",
});
await runFFmpeg({
  args: compiled.args,
  totalDurationSec: compiled.durationSec,
  onProgress: (p) => publishProgress(jobId, p.percent),
});
```

### Segment-parallel export (single machine)

```ts
import { renderSegments, withWorkDir } from "@vokop/pipeline";

await withWorkDir(async (workDir) => {
  await renderSegments({
    timeline, assetPaths, workDir,
    output: "/scratch/final.mp4",
    concurrency: 2,
    plan: { targetSegmentSec: 30 },
    onProgress: (pct) => publishProgress(jobId, pct),
  });
});
```

For multi-worker fan-out across the render farm: call `planSegments` in the
export service, enqueue one job per segment using `buildSegmentArgs`, and run
`concatSegments` in a finalizer job once all parts exist.

## Timeline model (v1)

Tracks in order — earlier video tracks composite *below* later ones:

```jsonc
{
  "width": 1080, "height": 1920, "fps": 30, "background": "#000000",
  "tracks": [
    { "id": "main", "type": "video", "clips": [
      { "id": "c1", "assetId": "a1", "start": 0, "duration": 4,
        "in": 0.5, "speed": 1, "fit": "cover",
        "transform": { "x": 0, "y": 0, "scale": 1, "rotation": 0, "opacity": 1 } }
    ]},
    { "id": "music",  "type": "audio", "clips": [
      { "id": "m1", "assetId": "a2", "start": 0, "duration": 10,
        "volume": 0.5, "fadeInSec": 0.5, "fadeOutSec": 1 } ]},
    { "id": "titles", "type": "text", "clips": [
      { "id": "t1", "start": 1, "duration": 3, "text": "សួស្តី",
        "style": { "fontSizePx": 64, "color": "#FFD24C", "x": 0.5, "y": 0.1 } } ]}
  ]
}
```

Times are seconds. `start`/`duration` = timeline time, `in` = source offset;
a clip at speed S consumes `duration * S` seconds of source.

**Khmer/Unicode text:** pass `fontFile` in `RenderOptions` pointing to a font
with Khmer coverage (e.g. Noto Sans Khmer) — bundle it in the worker image and
the desktop app.

## Determinism rules

1. All coordinates come from the timeline snapshot — never from wall clock.
2. Number formatting is locale-safe and rounded to 6 decimals.
3. Segment renders re-encode with identical codec settings, so
   `sliceTimeline` + concat is frame-equivalent to a single pass.

## Current limitations (v1 — by design, add later)

- No cross-clip transitions yet (xfade). Cuts only; transitions are the next
  schema addition and will constrain segment boundaries.
- No keyframe animation on transforms (static per clip).
- `amix` with `normalize=0` can clip if many loud tracks overlap — add a
  `alimiter` step when that becomes real.
- Text layout is single-anchor drawtext; rich text/multi-style comes with the
  presets module.

## Test

`node test/e2e.mjs` — generates sources with `testsrc`, runs ingest, unit
checks (escaping, atempo chain, slicing math), a single-pass render, and a
segment-parallel render with concat, then probes the outputs.
