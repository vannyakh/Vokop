import {
  clipSourceTimeAtTimeline,
} from '@/features/studio/lib/export/exportActiveTransition';
import {
  type CompositorExportLoopOptions,
  type CompositorSnapshot,
  type ExportCompositorResources,
  syncVideoForTimelineTime,
  visibleCanvasElements,
} from '@/features/studio/lib/compositorExport';
import {
  findVideoClipForPreview,
  listVideoTrackIds,
  timelineToVideoSourceTime,
} from '@/features/studio/lib/mediaClips';
import { renderCaptionsOnCanvas } from '@/features/studio/lib/captionRenderer';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import {
  blitWasmCompositorToCanvas,
  renderWasmCompositorFrame,
  resolveWasmContentRect,
} from '@/features/studio/lib/compositorWasm/wasmCompositorFrame';
import {
  initializeWasmGpuRenderer,
  isWasmGpuAvailable,
} from '@/features/studio/lib/compositorWasm/wasmGpuRenderer';
import { isWasmCompositorEnabled } from '@/features/studio/lib/compositorWasm/compositorWasmConfig';

export function shouldUseWasmCompositorExport(snapshot: CompositorSnapshot): boolean {
  if (!isWasmCompositorEnabled()) return false;
  const hasGlTransitions = snapshot.timelineTransitions.some(
    (t) => t.presetId && t.presetId !== 'cut',
  );
  return !hasGlTransitions;
}

async function resolveExportVideoFrame(
  video: HTMLVideoElement,
  snapshot: CompositorSnapshot,
  timelineTime: number,
  clip: MediaClip | null,
  resources: ExportCompositorResources | null,
): Promise<{
  clip: MediaClip | null;
  frame: CanvasImageSource | null;
  width: number;
  height: number;
}> {
  const pool = resources?.decoderPool;
  const videoTrackIds = listVideoTrackIds(
    snapshot.extraTimelineTracks,
    snapshot.timelineTrackOrder,
    snapshot.timelineTrackHidden,
  );

  const activeClip =
    clip ??
    findVideoClipForPreview(
      snapshot.videoClips,
      timelineTime,
      videoTrackIds,
      snapshot.timelineTrackPreviewHidden,
    );

  if (pool && activeClip) {
    const mapped = timelineToVideoSourceTime(
      snapshot.videoClips,
      timelineTime,
      videoTrackIds,
      snapshot.timelineTrackPreviewHidden,
    );
    const sourceTime = mapped?.sourceTime ?? clipSourceTimeAtTimeline(activeClip, timelineTime);
    const decoded = await pool.frameForClip(activeClip, sourceTime);
    if (decoded?.ready) {
      const el = decoded.decoder.video;
      return {
        clip: activeClip,
        frame: el,
        width: el.videoWidth,
        height: el.videoHeight,
      };
    }
  }

  if (activeClip && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return {
      clip: activeClip,
      frame: video,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  }

  if (snapshot.videoClips.length === 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return { clip: null, frame: video, width: video.videoWidth, height: video.videoHeight };
  }

  return { clip: activeClip, frame: null, width: 0, height: 0 };
}

async function renderWasmExportFrame(
  ctx: CanvasRenderingContext2D,
  options: CompositorExportLoopOptions,
  timelineTime: number,
  clip: MediaClip | null,
): Promise<void> {
  const { video, snapshot, exportSize, images, captions, settings } = options;
  const contentRect = resolveWasmContentRect({
    exportSize,
    videoSize: { width: snapshot.videoWidth, height: snapshot.videoHeight },
    aspectRatio: snapshot.aspectRatio,
  });

  const videoFrame = await resolveExportVideoFrame(
    video,
    snapshot,
    timelineTime,
    clip,
    options.exportResources ?? null,
  );

  const elements = visibleCanvasElements(snapshot, timelineTime);
  const { compositorCanvas } = await renderWasmCompositorFrame({
    exportSize,
    videoSize: { width: snapshot.videoWidth, height: snapshot.videoHeight },
    aspectRatio: snapshot.aspectRatio,
    contentRect,
    currentTime: timelineTime,
    videoClip: videoFrame.clip,
    canvasElements: elements,
    compositionBackground: snapshot.compositionBackground,
    videoFrame: videoFrame.frame,
    videoFrameWidth: videoFrame.width,
    videoFrameHeight: videoFrame.height,
    imageBySrc: images,
  });

  blitWasmCompositorToCanvas(ctx, compositorCanvas, exportSize);

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

async function runWasmSeekExportLoop(options: CompositorExportLoopOptions): Promise<void> {
  const { video, ctx, snapshot, rangeIn, rangeOut, settings } = options;
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
    await renderWasmExportFrame(ctx, options, timelineTime, clip);
    await options.onFrame?.(canvas, frame, timelineTime);
    options.onProgress(Math.min(100, ((frame + 1) / totalFrames) * 100));
    await nextPaint();
  }
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** Seek-based export loop using the WASM GPU compositor (WebCodecs path). */
export async function runWasmCompositorExportLoop(
  options: CompositorExportLoopOptions,
): Promise<boolean> {
  if (!shouldUseWasmCompositorExport(options.snapshot)) return false;

  await initializeWasmGpuRenderer();
  if (!isWasmGpuAvailable()) return false;

  await runWasmSeekExportLoop(options);
  return true;
}
