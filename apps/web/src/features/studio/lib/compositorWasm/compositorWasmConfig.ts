/** Feature flag + runtime guards for the WASM compositor preview scaffold. */

export function isWasmCompositorFlagEnabled(): boolean {
  return import.meta.env.VITE_WASM_COMPOSITOR === '1';
}

export function isWasmCompositorRuntimeSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof OffscreenCanvas === 'undefined') return false;
  return window.crossOriginIsolated === true;
}

export function isWasmCompositorEnabled(): boolean {
  return isWasmCompositorFlagEnabled() && isWasmCompositorRuntimeSupported();
}
