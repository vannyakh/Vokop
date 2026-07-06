import { loadCompositorWasmModule } from '@/features/studio/lib/compositorWasm/loadCompositorWasm';

let gpuAvailable = false;
let initPromise: Promise<void> | null = null;
let initError: string | null = null;

export function initializeWasmGpuRenderer(): Promise<void> {
  if (!initPromise) {
    initPromise = loadCompositorWasmModule()
      .then((mod) => mod.initializeGpu())
      .then(() => {
        gpuAvailable = true;
        initError = null;
      })
      .catch((error: unknown) => {
        gpuAvailable = false;
        initError = error instanceof Error ? error.message : String(error);
        console.warn(`[wasm-compositor] GPU unavailable: ${initError}`);
      });
  }
  return initPromise;
}

export function isWasmGpuAvailable(): boolean {
  return gpuAvailable;
}

export function getWasmGpuInitError(): string | null {
  return initError;
}

export function resetWasmGpuRendererForTests(): void {
  gpuAvailable = false;
  initPromise = null;
  initError = null;
}
