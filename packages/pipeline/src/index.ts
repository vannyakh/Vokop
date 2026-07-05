export {
  TimelineSchema,
  TrackSchema,
  VideoTrackSchema,
  AudioTrackSchema,
  TextTrackSchema,
  VideoClipSchema,
  AudioClipSchema,
  TextClipSchema,
  TextStyleSchema,
  TransformSchema,
  FitModeSchema,
  parseTimeline,
  computeDuration,
  referencedAssetIds,
} from "./timeline.js";
export type {
  Timeline,
  Track,
  VideoTrack,
  AudioTrack,
  TextTrack,
  VideoClip,
  AudioClip,
  TextClip,
  TextStyle,
  Transform,
  FitMode,
} from "./timeline.js";

export {
  runFFmpeg,
  runFFmpegCapture,
  runFFprobe,
  FFmpegError,
} from "./ffmpeg.js";
export type { FFmpegProgress, RunFFmpegOptions } from "./ffmpeg.js";

export { probe } from "./probe.js";
export type { MediaInfo } from "./probe.js";

export {
  ingestAsset,
  buildProxyArgs,
  buildThumbnailArgs,
  extractWaveformPeaks,
} from "./proxy.js";
export type {
  IngestOptions,
  IngestResult,
  ProxyOptions,
  ThumbnailOptions,
  WaveformOptions,
} from "./proxy.js";

export {
  buildRenderArgs,
  escapeDrawtext,
  atempoChain,
  ffColor,
  buildXfadeChain,
  resolveXfadeName,
  transitionsBetweenClips,
  areSequentialClips,
  PRESET_TO_XFADE,
} from "./filtergraph.js";
export type { XfadeTransition } from "./filtergraph.js";
export type {
  RenderOptions,
  CompiledRender,
  AssetMediaFlags,
} from "./filtergraph.js";

export {
  planSegments,
  findCutPoints,
  sliceTimeline,
  buildSegmentArgs,
  renderSegments,
  concatSegments,
} from "./segments.js";
export type {
  Segment,
  PlanOptions,
  RenderSegmentsOptions,
} from "./segments.js";

export { createWorkDir, removeWorkDir, withWorkDir } from "./tmp.js";
