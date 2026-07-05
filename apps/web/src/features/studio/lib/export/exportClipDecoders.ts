import { seekVideoElement } from '@/features/studio/lib/compositorExport';
import {
  collectClipVideoSources,
  resolveClipVideoSource,
  type ClipVideoSource,
} from '@/features/studio/lib/export/resolveClipVideoSource';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

async function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1) return;
  await new Promise<void>((resolve) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
  });
}

/** Per-source hidden `<video>` decoder used during export (WebCodecs-ready frame capture). */
export class ExportClipDecoder {
  readonly key: string;
  readonly video: HTMLVideoElement;
  #url = '';

  constructor(source: ClipVideoSource) {
    this.key = source.key;
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.crossOrigin = 'anonymous';
    this.video.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(this.video);
  }

  async bindUrl(url: string): Promise<void> {
    if (this.#url === url && this.video.readyState >= 1) return;
    this.#url = url;
    this.video.src = url;
    this.video.load();
    await waitForVideoMetadata(this.video);
  }

  async seekSourceTime(sourceTime: number): Promise<void> {
    await seekVideoElement(this.video, sourceTime);
  }

  isFrameReady(): boolean {
    return this.video.readyState >= 2;
  }

  /** Capture a WebCodecs frame after seek (caller must `.close()`). */
  async captureVideoFrame(sourceTime: number): Promise<VideoFrame | null> {
    await this.seekSourceTime(sourceTime);
    if (!this.isFrameReady() || typeof VideoFrame === 'undefined') return null;
    return new VideoFrame(this.video, {
      timestamp: Math.round(sourceTime * 1_000_000),
    });
  }

  dispose(): void {
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.video.remove();
  }
}

export interface ExportClipDecoderPoolContext {
  videoUrl: string | null;
  mediaAssets: MediaAsset[];
}

/**
 * One decoder per unique clip source URL.
 * Enables simultaneous outgoing/incoming frames for GL transition export.
 */
export class ExportClipDecoderPool {
  #decoders = new Map<string, ExportClipDecoder>();
  readonly #ctx: ExportClipDecoderPoolContext;

  constructor(ctx: ExportClipDecoderPoolContext) {
    this.#ctx = ctx;
  }

  async warmUp(clips: MediaClip[]): Promise<void> {
    const sources = collectClipVideoSources(clips, this.#ctx);
    await Promise.all(sources.map((source) => this.#decoderFor(source).bindUrl(source.url)));
  }

  async frameForClip(
    clip: MediaClip,
    sourceTime: number,
  ): Promise<{ decoder: ExportClipDecoder; ready: boolean } | null> {
    const source = resolveClipVideoSource(clip, this.#ctx);
    if (!source) return null;

    const decoder = this.#decoderFor(source);
    await decoder.bindUrl(source.url);
    await decoder.seekSourceTime(sourceTime);
    return { decoder, ready: decoder.isFrameReady() };
  }

  dispose(): void {
    for (const decoder of this.#decoders.values()) decoder.dispose();
    this.#decoders.clear();
  }

  #decoderFor(source: ClipVideoSource): ExportClipDecoder {
    let decoder = this.#decoders.get(source.key);
    if (!decoder) {
      decoder = new ExportClipDecoder(source);
      this.#decoders.set(source.key, decoder);
    }
    return decoder;
  }
}
