import type { AspectRatioId } from '@vokop/shared';
import { DEFAULT_COMPOSITION_BACKGROUND } from '@vokop/shared';
import { Check, Frame } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { CompositionBackgroundPanel } from '@/features/studio/components/CompositionBackgroundPanel';
import { InspectorDock, InspectorSection } from '@/features/studio/components/InspectorSection';
import { PropertyRow } from '@/features/studio/components/PropertyRow';
import { frameReferenceSize } from '@/features/studio/lib/canvasCoords';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import {
  ASPECT_RATIOS,
  getAspectRatioOption,
  getDisplayRatio,
} from '@/features/studio/constants/aspectRatios';

function formatRatio(value: number): string {
  return (Math.round(value * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '');
}

function compositionExportSize(
  aspectRatio: AspectRatioId,
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  const displayRatio =
    getDisplayRatio(aspectRatio, videoWidth, videoHeight) ??
    (videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9);
  const height = 1080;
  return { width: Math.max(2, Math.round(height * displayRatio)), height };
}

export function CompositionFramePanel() {
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const setAspectRatio = useAppStore((s) => s.setAspectRatio);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const duration = useAppStore((s) => s.duration);
  const mediaDuration = useAppStore((s) => s.mediaDuration);
  const compositionBackground = useAppStore(
    (s) => s.projectEditor.compositionBackground ?? DEFAULT_COMPOSITION_BACKGROUND,
  );
  const setCompositionBackground = useAppStore((s) => s.setCompositionBackground);

  const ratioOption = getAspectRatioOption(aspectRatio);
  const refSize = frameReferenceSize(videoWidth, videoHeight);
  const displayRatio =
    getDisplayRatio(aspectRatio, videoWidth, videoHeight) ??
    refSize.width / refSize.height;
  const exportSize = compositionExportSize(aspectRatio, videoWidth, videoHeight);
  const outputSummary = `${exportSize.width}×${exportSize.height} · ${formatStudioTimecode(duration)}`;

  return (
    <InspectorDock
      title="Composition"
      icon={<Frame size={12} className="text-accent" />}
      className="composition-panel"
    >
      <InspectorSection
        id="composition-aspect"
        title="Aspect"
        summary={ratioOption.label}
        defaultOpen
        className="composition-panel-section"
      >
        <div className="composition-aspect-grid">
          {ASPECT_RATIOS.map((option) => {
            const active = aspectRatio === option.id;
            return (
              <button
                key={option.id}
                type="button"
                title={option.hint}
                onClick={() => setAspectRatio(option.id)}
                className={cn('composition-aspect-chip', active && 'is-active')}
              >
                <span className="composition-aspect-chip-icon" data-ratio={option.id} />
                <span className="composition-aspect-chip-copy">
                  <span className="composition-aspect-chip-label">{option.label}</span>
                  <span className="composition-aspect-chip-hint">{option.hint}</span>
                </span>
                {active ? <Check size={12} className="composition-aspect-chip-check" /> : null}
              </button>
            );
          })}
        </div>
      </InspectorSection>

      <CompositionBackgroundPanel
        background={compositionBackground}
        onChange={(patch) => setCompositionBackground(patch)}
        compact
      />

      <InspectorSection
        id="composition-output"
        title="Output"
        summary={outputSummary}
        defaultOpen={false}
        className="composition-panel-section composition-panel-section--dense"
      >
        <div className="composition-output-grid">
          <PropertyRow label="Ratio">
            <span className="property-row-value-readonly font-mono">{formatRatio(displayRatio)}</span>
          </PropertyRow>
          <PropertyRow label="Export">
            <span className="property-row-value-readonly font-mono">
              {exportSize.width} × {exportSize.height}
            </span>
          </PropertyRow>
          <PropertyRow label="Source">
            <span className="property-row-value-readonly font-mono">
              {videoWidth > 0 && videoHeight > 0 ? `${videoWidth}×${videoHeight}` : '—'}
            </span>
          </PropertyRow>
          <PropertyRow label="Duration">
            <span className="property-row-value-readonly font-mono">
              {formatStudioTimecode(duration)}
            </span>
          </PropertyRow>
          {mediaDuration > 0 && mediaDuration !== duration ? (
            <PropertyRow label="Media">
              <span className="property-row-value-readonly font-mono">
                {formatStudioTimecode(mediaDuration)}
              </span>
            </PropertyRow>
          ) : null}
        </div>
      </InspectorSection>
    </InspectorDock>
  );
}
