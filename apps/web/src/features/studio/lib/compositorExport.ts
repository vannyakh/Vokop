import {
  EXPORT_RESOLUTION_HEIGHT,
  getDisplayRatio,
  getFilterCss,
  type AspectRatioId,
  type ExportResolution,
  type ExportSettings,
  type TimelineTransition,
  type CompositionBackground,
  DEFAULT_COMPOSITION_BACKGROUND,
} from '@vokop/shared';
import {
  clipSourceTimeAtTimeline,
  findActiveExportTransition,
} from '@/features/studio/lib/export/exportActiveTransition';
import {
  drawCompositionBackground,
  resolveClipBackground,
} from '@/features/studio/lib/compositionBackground';
import {
  ExportClipDecoderPool,
  type ExportClipDecoderPoolContext,
} from '@/features/studio/lib/export/exportClipDecoders';
import {
  createExportTransitionBlender,
  type ExportTransitionBlender,
} from '@/features/studio/lib/export/exportTransitionCompositor';
import type { CanvasElement } from '@/types/canvas';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import { getVideoContentRect, type CanvasRect } from '@/features/studio/lib/canvasCoords';
import { drawCanvasElement } from '@/features/studio/lib/canvasElementRasterizer';
import {
  listVideoTrackIds,
  timelineToVideoSourceTime,
  findVideoClipForPreview,
} from '@/features/studio/lib/mediaClips';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import { resolveVideoClipLayout } from '@/features/studio/lib/videoClipLayout';
import { isElementVisible } from '@/features/studio/lib/canvasElements';
import { ensureFontsForCanvasElements } from '@/features/studio/lib/fontLoader';
import {
  parseTranscriptCaptions,
  renderCaptionsOnCanvas,
  type TimedCaption,
} from '@/features/studio/lib/captionRenderer';
import type { ExtraTimelineTrack } from '@/features/studio/lib/timelineTypes';

/** Immutable project snapshot for off-thread-style compositor rendering during export. */
export interface CompositorSnapshot {
  aspectRatio: AspectRatioId;
  videoWidth: number;
  videoHeight: number;
  videoFilterCss: string;
  videoClips: MediaClip[];
  extraTimelineTracks: ExtraTimelineTrack[];
  timelineTrackOrder: string[];
  timelineTrackHidden: string[];
  timelineTrackPreviewHidden: Record<string, boolean>;
  canvasElements: CanvasElement[];
  mediaAssets: MediaAsset[];
  translatedText: string;
  videoUrl: string | null;
  timelineTransitions: TimelineTransition[];
  compositionBackground: CompositionBackground;
}

export function buildCompositorSnapshot(state: {
  aspectRatio: AspectRatioId;
  videoWidth: number;
  videoHeight: number;
  projectEditor: { videoFilterId: string | null; timelineTransitions: TimelineTransition[]; compositionBackground: CompositionBackground };
  videoClips: MediaClip[];
  extraTimelineTracks: ExtraTimelineTrack[];
  timelineTrackOrder: string[];
  timelineTrackHidden: string[];
  timelineTrackPreviewHidden: Record<string, boolean>;
  canvasElements: CanvasElement[];
  mediaAssets: MediaAsset[];
  translatedText: string;
  videoUrl: string | null;
}): CompositorSnapshot {
  return {
    aspectRatio: state.aspectRatio,
    videoWidth: state.videoWidth,
    videoHeight: state.videoHeight,
    videoFilterCss: getFilterCss(state.projectEditor.videoFilterId),
    videoClips: state.videoClips,
    extraTimelineTracks: state.extraTimelineTracks,
    timelineTrackOrder: state.timelineTrackOrder,
    timelineTrackHidden: state.timelineTrackHidden,
    timelineTrackPreviewHidden: state.timelineTrackPreviewHidden,
    canvasElements: state.canvasElements,
    mediaAssets: state.mediaAssets,
    translatedText: state.translatedText,
    videoUrl: state.videoUrl,
    timelineTransitions: state.projectEditor.timelineTransitions,
    compositionBackground:
      state.projectEditor.compositionBackground ?? DEFAULT_COMPOSITION_BACKGROUND,
  };
}

export interface ExportCompositorResources {
  decoderPool: ExportClipDecoderPool;
  transitionBlender: ExportTransitionBlender | null;
}

/** Prepare per-clip decoders + optional GL transition blender for export. */
export async function createExportCompositorResources(
  snapshot: CompositorSnapshot,
): Promise<ExportCompositorResources> {
  const ctx: ExportClipDecoderPoolContext = {
    videoUrl: snapshot.videoUrl,
    mediaAssets: snapshot.mediaAssets,
  };
  const decoderPool = new ExportClipDecoderPool(ctx);
  await decoderPool.warmUp(snapshot.videoClips);

  let transitionBlender: ExportTransitionBlender | null = null;
  if (snapshot.timelineTransitions.some((t) => t.presetId && t.presetId !== 'cut')) {
    try {
      transitionBlender = createExportTransitionBlender();
    } catch {
      transitionBlender = null;
    }
  }

  return { decoderPool, transitionBlender };
}

export function disposeExportCompositorResources(resources: ExportCompositorResources | null): void {
  resources?.decoderPool.dispose();
  resources?.transitionBlender?.dispose();
}

/** Output frame size honoring project aspect ratio + export resolution preset. */
export function resolveCompositorExportSize(
  snapshot: CompositorSnapshot,
  resolution: ExportResolution,
): { width: number; height: number } {
  const displayRatio =
    getDisplayRatio(snapshot.aspectRatio, snapshot.videoWidth, snapshot.videoHeight) ??
    (snapshot.videoWidth > 0 && snapshot.videoHeight > 0
      ? snapshot.videoWidth / snapshot.videoHeight
      : 16 / 9);

  const targetH = EXPORT_RESOLUTION_HEIGHT[resolution];
  if (!targetH) {
    if (displayRatio >= 1) {
      const width = snapshot.videoWidth || 1920;
      return { width, height: Math.round(width / displayRatio) };
    }
    const height = snapshot.videoHeight || 1080;
    return { width: Math.round(height * displayRatio), height };
  }

  const height = targetH;
  return { width: Math.max(2, Math.round(height * displayRatio)), height };
}

export function seekVideoElement(video: HTMLVideoElement, time: number): Promise<void> {
  const max = Number.isFinite(video.duration) ? video.duration : time;
  const target = Math.max(0, Math.min(time, max));
  if (Math.abs(video.currentTime - target) < 0.0005) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener('seeked', () => resolve(), { once: true });
    video.currentTime = target;
  });
}

async function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1) return;
  await new Promise<void>((resolve) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
  });
}

/** Seek the preview `<video>` to the source frame for a timeline playhead time. */
export async function syncVideoForTimelineTime(
  video: HTMLVideoElement,
  snapshot: CompositorSnapshot,
  timelineTime: number,
): Promise<MediaClip | null> {
  const videoTrackIds = listVideoTrackIds(
    snapshot.extraTimelineTracks,
    snapshot.timelineTrackOrder,
    snapshot.timelineTrackHidden,
  );
  const mapped = timelineToVideoSourceTime(
    snapshot.videoClips,
    timelineTime,
    videoTrackIds,
    snapshot.timelineTrackPreviewHidden,
  );

  if (!mapped) {
    await seekVideoElement(video, timelineTime);
    return null;
  }

  const { clip, sourceTime } = mapped;
  if (clip.mediaAssetId) {
    const asset = snapshot.mediaAssets.find((item) => item.id === clip.mediaAssetId);
    if (asset?.url && video.getAttribute('src') !== asset.url) {
      video.src = asset.url;
      video.load();
      await waitForVideoMetadata(video);
    }
  }

  await seekVideoElement(video, sourceTime);
  return clip;
}

export function visibleCanvasElements(snapshot: CompositorSnapshot, timelineTime: number): CanvasElement[] {
  return snapshot.canvasElements.filter((el) => {
    if (!isElementVisible(el, timelineTime)) return false;
    const trackId =
      el.trackId ??
      (el.type === 'text' || el.type === 'overlay'
        ? 'text'
        : el.type === 'logo' || el.type === 'image'
          ? 'image'
          : undefined);
    if (trackId && snapshot.timelineTrackPreviewHidden[trackId]) return false;
    return true;
  });
}

function drawClipFrame(
  ctx: CanvasRenderingContext2D,
  frame: CanvasImageSource,
  clip: MediaClip,
  snapshot: CompositorSnapshot,
  timelineTime: number,
  contentRect: CanvasRect,
): void {
  const layout = resolveVideoClipLayout(clip, contentRect, timelineTime);
  ctx.save();
  ctx.globalAlpha = layout.opacity;
  if (snapshot.videoFilterCss !== 'none') {
    ctx.filter = snapshot.videoFilterCss;
  }
  ctx.translate(layout.x + layout.width / 2, layout.y + layout.height / 2);
  ctx.scale(clip.flipX ? -1 : 1, clip.flipY ? -1 : 1);
  ctx.rotate((layout.rotation * Math.PI) / 180);
  ctx.drawImage(frame, -layout.width / 2, -layout.height / 2, layout.width, layout.height);
  ctx.restore();
}

async function drawVideoLayers(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  snapshot: CompositorSnapshot,
  timelineTime: number,
  contentRect: CanvasRect,
  resources: ExportCompositorResources | null,
  legacyClip: MediaClip | null,
  images: Map<string, HTMLImageElement>,
): Promise<void> {
  const pool = resources?.decoderPool;
  const blender = resources?.transitionBlender;
  const videoTrackIds = listVideoTrackIds(
    snapshot.extraTimelineTracks,
    snapshot.timelineTrackOrder,
    snapshot.timelineTrackHidden,
  );
  const mappedClip =
    legacyClip ??
    findVideoClipForPreview(
      snapshot.videoClips,
      timelineTime,
      videoTrackIds,
      snapshot.timelineTrackPreviewHidden,
    );
  const background = resolveClipBackground(mappedClip, snapshot.compositionBackground);
  let backgroundFrame: CanvasImageSource | null = null;

  if (pool && mappedClip) {
    const frame = await pool.frameForClip(
      mappedClip,
      mappedClip
        ? mappedClip.sourceStart +
            Math.min(Math.max(0, timelineTime - mappedClip.start), mappedClip.duration)
        : timelineTime,
    );
    if (frame?.ready) backgroundFrame = frame.decoder.video;
  } else if (video.readyState >= 2) {
    backgroundFrame = video;
  }

  await drawCompositionBackground(
    ctx,
    contentRect,
    background,
    snapshot.mediaAssets,
    backgroundFrame,
    images,
  );

  if (pool) {
    const active = findActiveExportTransition(
      snapshot.timelineTransitions,
      snapshot.videoClips,
      timelineTime,
    );

    if (active && blender) {
      const [outgoingFrame, incomingFrame] = await Promise.all([
        pool.frameForClip(active.outgoing, clipSourceTimeAtTimeline(active.outgoing, timelineTime)),
        pool.frameForClip(active.incoming, clipSourceTimeAtTimeline(active.incoming, timelineTime)),
      ]);

      if (outgoingFrame?.ready && incomingFrame?.ready) {
        const blended = await blender.draw({
          from: outgoingFrame.decoder.video,
          to: incomingFrame.decoder.video,
          presetId: active.transition.presetId,
          progress: active.progress,
          width: Math.max(2, Math.round(contentRect.width)),
          height: Math.max(2, Math.round(contentRect.height)),
        });

        ctx.save();
        if (snapshot.videoFilterCss !== 'none') {
          ctx.filter = snapshot.videoFilterCss;
        }
        ctx.drawImage(blended, contentRect.x, contentRect.y, contentRect.width, contentRect.height);
        ctx.restore();
        return;
      }
    }

    const mapped = timelineToVideoSourceTime(
      snapshot.videoClips,
      timelineTime,
      videoTrackIds,
      snapshot.timelineTrackPreviewHidden,
    );

    if (mapped) {
      const frame = await pool.frameForClip(mapped.clip, mapped.sourceTime);
      if (frame?.ready) {
        drawClipFrame(ctx, frame.decoder.video, mapped.clip, snapshot, timelineTime, contentRect);
        return;
      }
    }
  }

  if (!legacyClip || video.readyState < 2) {
    if (snapshot.videoClips.length === 0 && video.readyState >= 2) {
      ctx.save();
      if (snapshot.videoFilterCss !== 'none') {
        ctx.filter = snapshot.videoFilterCss;
      }
      ctx.drawImage(video, contentRect.x, contentRect.y, contentRect.width, contentRect.height);
      ctx.restore();
      return;
    }
    return;
  }

  drawClipFrame(ctx, video, legacyClip, snapshot, timelineTime, contentRect);
}

/** Render one composited export frame (video layout + canvas overlays + captions). */
export async function renderCompositorFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  snapshot: CompositorSnapshot,
  timelineTime: number,
  exportSize: { width: number; height: number },
  captions: TimedCaption[],
  settings: Pick<ExportSettings, 'captionStyle' | 'captionScale'>,
  images: Map<string, HTMLImageElement>,
  clip: MediaClip | null,
  resources: ExportCompositorResources | null = null,
): Promise<void> {
  const displayRatio = getDisplayRatio(snapshot.aspectRatio, snapshot.videoWidth, snapshot.videoHeight);
  const contentRect = getVideoContentRect(
    exportSize,
    { width: snapshot.videoWidth, height: snapshot.videoHeight },
    displayRatio,
  );

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, exportSize.width, exportSize.height);
  ctx.filter = 'none';

  await drawVideoLayers(ctx, video, snapshot, timelineTime, contentRect, resources, clip, images);

  for (const element of visibleCanvasElements(snapshot, timelineTime)) {
    drawCanvasElement(ctx, element, timelineTime, contentRect, images);
  }

  renderCaptionsOnCanvas(
    ctx,
    captions,
    timelineTime,
    exportSize.width,
    exportSize.height,
    settings.captionStyle,
    settings.captionScale,
  );
}

export async function preloadCanvasImages(
  elements: CanvasElement[],
  extraUrls: string[] = [],
): Promise<Map<string, HTMLImageElement>> {
  const urls = [
    ...new Set([
      ...elements
        .filter((el) => (el.type === 'logo' || el.type === 'image') && el.src)
        .map((el) => el.src!),
      ...extraUrls.filter(Boolean),
    ]),
  ];
  await ensureFontsForCanvasElements(elements);

  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            map.set(src, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );
  return map;
}

export interface CompositorExportLoopOptions {
  video: HTMLVideoElement;
  ctx: CanvasRenderingContext2D;
  snapshot: CompositorSnapshot;
  settings: ExportSettings;
  captions: TimedCaption[];
  exportSize: { width: number; height: number };
  images: Map<string, HTMLImageElement>;
  rangeIn: number;
  rangeOut: number;
  /** When true, play video in realtime so original audio stays in sync with MediaRecorder. */
  syncOriginalAudio: boolean;
  /** Force seek-based frames (required for WebCodecs export). */
  forceSeekLoop?: boolean;
  /** Called after each composited frame is drawn (WebCodecs encode hook). */
  onFrame?: (canvas: HTMLCanvasElement, frameIndex: number, timelineTime: number) => void | Promise<void>;
  /** Per-clip decoders + GL transition blender (Phase D). */
  exportResources?: ExportCompositorResources | null;
  onProgress: (percent: number) => void;
  shouldStop: () => boolean;
}

/** Omniclip-style frame loop — seek-based when audio is voice-only, playback when original audio is included. */
export async function runCompositorExportLoop(options: CompositorExportLoopOptions): Promise<void> {
  if (options.forceSeekLoop || !options.syncOriginalAudio) {
    await runSeekCompositorLoop(options);
  } else {
    await runPlaybackCompositorLoop(options);
  }
}

async function runSeekCompositorLoop(options: CompositorExportLoopOptions): Promise<void> {
  const { video, ctx, snapshot, settings, captions, exportSize, images, rangeIn, rangeOut } = options;
  const fps = settings.fps;
  const duration = Math.max(0.001, rangeOut - rangeIn);
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const canvas = ctx.canvas;

  video.pause();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    if (options.shouldStop()) return;
    const timelineTime = Math.min(rangeOut, rangeIn + frame / fps);
    const clip = options.exportResources
      ? null
      : await syncVideoForTimelineTime(video, snapshot, timelineTime);
    await renderCompositorFrame(
      ctx,
      video,
      snapshot,
      timelineTime,
      exportSize,
      captions,
      settings,
      images,
      clip,
      options.exportResources ?? null,
    );
    await options.onFrame?.(canvas, frame, timelineTime);
    options.onProgress(Math.min(100, ((frame + 1) / totalFrames) * 100));
    await nextPaint();
  }
}

async function runPlaybackCompositorLoop(options: CompositorExportLoopOptions): Promise<void> {
  const { video, ctx, snapshot, settings, captions, exportSize, images, rangeIn, rangeOut } = options;
  const duration = Math.max(0.001, rangeOut - rangeIn);
  const videoTrackIds = listVideoTrackIds(
    snapshot.extraTimelineTracks,
    snapshot.timelineTrackOrder,
    snapshot.timelineTrackHidden,
  );

  video.pause();
  let activeClip = await syncVideoForTimelineTime(video, snapshot, rangeIn);

  await new Promise<void>((resolve) => {
    let raf = 0;

    const finish = () => {
      cancelAnimationFrame(raf);
      video.pause();
      resolve();
    };

    const tick = () => {
      if (options.shouldStop()) {
        finish();
        return;
      }

      let timelineTime = rangeIn;
      if (activeClip) {
        timelineTime = activeClip.start + (video.currentTime - activeClip.sourceStart);
      } else if (snapshot.videoClips.length === 0) {
        timelineTime = rangeIn + Math.max(0, video.currentTime - rangeIn);
      } else {
        timelineTime = rangeIn;
      }

      if (timelineTime >= rangeOut || video.ended) {
        options.onProgress(100);
        finish();
        return;
      }

      const mapped = timelineToVideoSourceTime(
        snapshot.videoClips,
        timelineTime,
        videoTrackIds,
        snapshot.timelineTrackPreviewHidden,
      );
      if (mapped && mapped.clip.id !== activeClip?.id) {
        activeClip = mapped.clip;
      }

      void (async () => {
        await renderCompositorFrame(
          ctx,
          video,
          snapshot,
          timelineTime,
          exportSize,
          captions,
          settings,
          images,
          options.exportResources ? null : activeClip,
          options.exportResources ?? null,
        );

        options.onProgress(Math.min(100, ((timelineTime - rangeIn) / duration) * 100));

        if (video.paused) {
          void video.play().catch(() => finish());
        }

        if (!options.shouldStop()) {
          raf = requestAnimationFrame(tick);
        }
      })();
    };

    void video.play().catch(() => finish());
    raf = requestAnimationFrame(tick);
  });
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function parseExportCaptions(translatedText: string): TimedCaption[] {
  return parseTranscriptCaptions(translatedText);
}
