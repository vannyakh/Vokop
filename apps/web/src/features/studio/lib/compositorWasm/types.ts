/** OpenCut compositor JSON + texture upload shapes (sample: @templates/OpenCut). */

export type WasmBlendMode = 'normal' | 'screen' | 'multiply';

export type WasmQuadTransform = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotationDegrees: number;
  flipX: boolean;
  flipY: boolean;
};

export type WasmLayerMask = {
  textureId: string;
  feather: number;
  inverted: boolean;
};

export type WasmFrameLayerItem = {
  type: 'layer';
  textureId: string;
  transform: WasmQuadTransform;
  opacity: number;
  blendMode: WasmBlendMode;
  effectPassGroups: unknown[][];
  mask: WasmLayerMask | null;
};

export type WasmFrameDescriptor = {
  width: number;
  height: number;
  clear: {
    color: [number, number, number, number];
  };
  items: WasmFrameLayerItem[];
};

export type WasmExternalTexture = {
  kind: 'external';
  id: string;
  source: CanvasImageSource;
  width: number;
  height: number;
};

export type WasmRenderedTexture = {
  kind: 'rendered';
  id: string;
  contentHash: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void;
};

export type WasmTextureUpload = WasmExternalTexture | WasmRenderedTexture;

export type WasmFrameProfileEntry = {
  name: string;
  durationMs: number;
};

export interface CompositorWasmModule {
  initializeGpu: () => Promise<void>;
  initCompositor: (width: number, height: number) => void;
  resizeCompositor: (width: number, height: number) => void;
  uploadTexture: (descriptor: {
    id: string;
    source: OffscreenCanvas;
    width: number;
    height: number;
  }) => void;
  releaseTexture: (id: string) => void;
  renderFrame: (frame: WasmFrameDescriptor) => void;
  getCompositorCanvas: () => HTMLCanvasElement;
  getLastFrameProfile: () => WasmFrameProfileEntry[];
}
