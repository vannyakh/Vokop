import type { CompositorWasmModule } from '@/features/studio/lib/compositorWasm/types';

let modulePromise: Promise<CompositorWasmModule> | null = null;

function readWasmPanic(): string | null {
  const panic = (window as Window & { __wasmPanic?: string }).__wasmPanic;
  if (!panic) return null;
  delete (window as Window & { __wasmPanic?: string }).__wasmPanic;
  return panic;
}

function wrapWasmError(error: unknown): Error {
  const panic = readWasmPanic();
  if (panic) return new Error(panic);
  if (error instanceof Error) return error;
  return new Error(String(error));
}

/** Lazy-load `opencut-wasm` so the bundle stays optional when the flag is off. */
export function loadCompositorWasmModule(): Promise<CompositorWasmModule> {
  if (!modulePromise) {
    modulePromise = import('opencut-wasm')
      .then((mod) => mod as unknown as CompositorWasmModule)
      .catch((error: unknown) => {
        modulePromise = null;
        throw wrapWasmError(error);
      });
  }
  return modulePromise;
}

export function resetCompositorWasmModuleForTests(): void {
  modulePromise = null;
}
