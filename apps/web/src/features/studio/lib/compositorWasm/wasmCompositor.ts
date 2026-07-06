import { createBackingCanvas, ensureOffscreenCanvas } from '@/features/studio/lib/compositorWasm/offscreenCanvas';
import type {
  CompositorWasmModule,
  WasmFrameDescriptor,
  WasmTextureUpload,
} from '@/features/studio/lib/compositorWasm/types';
import { loadCompositorWasmModule } from '@/features/studio/lib/compositorWasm/loadCompositorWasm';

type RenderedCacheEntry = {
  kind: 'rendered';
  canvas: OffscreenCanvas;
  contentHash: string;
  width: number;
  height: number;
};

type ExternalCacheEntry = {
  kind: 'external';
  source: CanvasImageSource;
  width: number;
  height: number;
};

/**
 * Thin wrapper around OpenCut's wasm compositor API.
 * Mirrors `@templates/OpenCut/apps/web/src/services/renderer/compositor/wasm-compositor.ts`.
 */
export class WasmCompositorEngine {
  private wasm: CompositorWasmModule | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private initializedSize: { width: number; height: number } | null = null;
  private cache = new Map<string, RenderedCacheEntry | ExternalCacheEntry>();

  async ensureWasmLoaded(): Promise<CompositorWasmModule> {
    if (!this.wasm) {
      this.wasm = await loadCompositorWasmModule();
    }
    return this.wasm;
  }

  async ensureInitialized({ width, height }: { width: number; height: number }) {
    const wasm = await this.ensureWasmLoaded();
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));

    if (!this.canvas) {
      wasm.initCompositor(w, h);
      this.canvas = wasm.getCompositorCanvas();
      this.initializedSize = { width: w, height: h };
      return;
    }

    if (!this.initializedSize || this.initializedSize.width !== w || this.initializedSize.height !== h) {
      wasm.resizeCompositor(w, h);
      this.initializedSize = { width: w, height: h };
    }
  }

  getCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      throw new Error('WASM compositor is not initialized');
    }
    return this.canvas;
  }

  async syncTextures(textures: WasmTextureUpload[]) {
    const wasm = await this.ensureWasmLoaded();
    const nextIds = new Set(textures.map((texture) => texture.id));

    for (const previousId of this.cache.keys()) {
      if (!nextIds.has(previousId)) {
        wasm.releaseTexture(previousId);
        this.cache.delete(previousId);
      }
    }

    for (const texture of textures) {
      if (texture.kind === 'external') {
        this.syncExternalTexture(wasm, texture);
      } else {
        this.syncRenderedTexture(wasm, texture);
      }
    }
  }

  async render(frame: WasmFrameDescriptor) {
    const wasm = await this.ensureWasmLoaded();
    wasm.renderFrame(frame);
  }

  async getLastFrameProfile() {
    const wasm = await this.ensureWasmLoaded();
    return wasm.getLastFrameProfile();
  }

  dispose() {
    if (this.wasm) {
      for (const id of this.cache.keys()) {
        this.wasm.releaseTexture(id);
      }
    }
    this.cache.clear();
    this.canvas = null;
    this.initializedSize = null;
  }

  private syncExternalTexture(wasm: CompositorWasmModule, texture: Extract<WasmTextureUpload, { kind: 'external' }>) {
    const previous = this.cache.get(texture.id);
    if (
      previous?.kind === 'external' &&
      previous.source === texture.source &&
      previous.width === texture.width &&
      previous.height === texture.height
    ) {
      return;
    }

    wasm.uploadTexture({
      id: texture.id,
      source: ensureOffscreenCanvas({
        source: texture.source,
        width: texture.width,
        height: texture.height,
        label: `texture upload ${texture.id}`,
      }),
      width: texture.width,
      height: texture.height,
    });
    this.cache.set(texture.id, {
      kind: 'external',
      source: texture.source,
      width: texture.width,
      height: texture.height,
    });
  }

  private syncRenderedTexture(wasm: CompositorWasmModule, texture: Extract<WasmTextureUpload, { kind: 'rendered' }>) {
    const previous = this.cache.get(texture.id);
    if (
      previous?.kind === 'rendered' &&
      previous.contentHash === texture.contentHash &&
      previous.width === texture.width &&
      previous.height === texture.height
    ) {
      return;
    }

    const canvas =
      previous?.kind === 'rendered' &&
      previous.width === texture.width &&
      previous.height === texture.height
        ? previous.canvas
        : createBackingCanvas({
            width: texture.width,
            height: texture.height,
          });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(`Failed to get 2d context for texture ${texture.id}`);
    }
    ctx.clearRect(0, 0, texture.width, texture.height);
    texture.draw(ctx);

    wasm.uploadTexture({
      id: texture.id,
      source: canvas,
      width: texture.width,
      height: texture.height,
    });
    this.cache.set(texture.id, {
      kind: 'rendered',
      canvas,
      contentHash: texture.contentHash,
      width: texture.width,
      height: texture.height,
    });
  }
}

export const wasmCompositorEngine = new WasmCompositorEngine();
