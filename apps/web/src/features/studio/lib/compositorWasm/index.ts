export { isWasmCompositorEnabled, isWasmCompositorFlagEnabled, isWasmCompositorRuntimeSupported } from '@/features/studio/lib/compositorWasm/compositorWasmConfig';
export { loadCompositorWasmModule } from '@/features/studio/lib/compositorWasm/loadCompositorWasm';
export {
  getWasmGpuInitError,
  initializeWasmGpuRenderer,
  isWasmGpuAvailable,
} from '@/features/studio/lib/compositorWasm/wasmGpuRenderer';
export { wasmCompositorEngine, WasmCompositorEngine } from '@/features/studio/lib/compositorWasm/wasmCompositor';
export { buildPreviewTextures, buildCompositorTextures, collectOverlayImageUrls, collectOverlayFontFamilies } from '@/features/studio/lib/compositorWasm/buildCompositorTextures';
export { toWasmFrameDescriptor } from '@/features/studio/lib/compositorWasm/toWasmFrameDescriptor';
export {
  blitWasmCompositorToCanvas,
  renderWasmCompositorFrame,
  resolveWasmContentRect,
} from '@/features/studio/lib/compositorWasm/wasmCompositorFrame';
export {
  runWasmCompositorExportLoop,
  shouldUseWasmCompositorExport,
} from '@/features/studio/lib/compositorWasm/wasmCompositorExport';
export type {
  CompositorWasmModule,
  WasmFrameDescriptor,
  WasmTextureUpload,
} from '@/features/studio/lib/compositorWasm/types';
