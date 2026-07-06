import { useState } from 'react';
import { X } from 'lucide-react';
import {
  isWasmCompositorFlagEnabled,
  isWasmCompositorRuntimeSupported,
} from '@/features/studio/lib/compositorWasm';

/**
 * Shown when the WASM GPU compositor is enabled but the browser can't run it
 * (missing cross-origin isolation / OffscreenCanvas). Preview silently falls
 * back to the canvas renderer; this makes the degradation visible.
 */
export function StudioRendererBanner() {
  const [dismissed, setDismissed] = useState(false);
  const degraded = isWasmCompositorFlagEnabled() && !isWasmCompositorRuntimeSupported();

  if (!degraded || dismissed) return null;

  return (
    <div className="studio-renderer-banner" role="status">
      <span>
        GPU compositor unavailable in this browser — preview uses the standard renderer. For best
        performance, open Vokop in Chrome.
      </span>
      <button
        type="button"
        className="studio-renderer-banner-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}
