import { useEffect, useRef, useState } from 'react';
import { findGlTransition } from '@/features/studio/lib/glTransitions';
import { createTransitionRenderer } from '@/features/studio/lib/glTransitionRenderer';

interface TransitionPreviewProps {
  presetId: string | null | undefined;
  label?: string;
}

/** Animated WebGL preview of a gl-transitions shader for a Vokop preset id. */
export function TransitionPreview({ presetId, label }: TransitionPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !presetId || presetId === 'cut') {
      setName(presetId === 'cut' ? 'Cut' : '');
      setError(null);
      return;
    }

    let disposed = false;
    let raf = 0;
    let renderer: ReturnType<typeof createTransitionRenderer> | null = null;
    const started = performance.now();

    void (async () => {
      try {
        const transition = await findGlTransition(presetId);
        if (disposed || !transition || !canvasRef.current) {
          setError(transition ? null : 'Preview unavailable');
          return;
        }
        setName(transition.name);
        setError(null);
        renderer = createTransitionRenderer(canvasRef.current, transition);

        const tick = (now: number) => {
          if (disposed || !renderer) return;
          // Loop 0 → 1 → 0 over ~2.4s
          const t = ((now - started) % 2400) / 1200;
          const progress = t <= 1 ? t : 2 - t;
          renderer.setProgress(progress);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : 'Preview failed');
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer?.dispose();
    };
  }, [presetId]);

  if (!presetId) {
    return <p className="tools-coming-soon-label">Select a transition to preview</p>;
  }

  if (presetId === 'cut') {
    return (
      <div className="transition-preview transition-preview--cut">
        <span>Instant cut — no blend</span>
      </div>
    );
  }

  return (
    <div className="transition-preview">
      <canvas ref={canvasRef} width={280} height={158} className="transition-preview-canvas" />
      <div className="transition-preview-meta">
        <span className="transition-preview-label">{label ?? presetId}</span>
        {name && <span className="transition-preview-shader font-mono">{name}</span>}
      </div>
      {error && <p className="transition-preview-error">{error}</p>}
    </div>
  );
}
