import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TEXT_EFFECTS } from '@/features/studio/constants/textEffects';
import { textEffectPreviewCss } from '@/features/studio/lib/textEffectPreviewStyle';
import type { TextEffectPreview } from '@vokop/api';
import type { CanvasTextEffectId } from '@/types/canvas';

interface TextEffectPreviewCardProps {
  effectId: CanvasTextEffectId;
  preview?: TextEffectPreview;
  compact?: boolean;
  selected?: boolean;
  onClick: () => void;
}

export function TextEffectPreviewCard({
  effectId,
  preview,
  compact = false,
  selected = false,
  onClick,
}: TextEffectPreviewCardProps) {
  const cfg = TEXT_EFFECTS[effectId];
  const hasPhoto = Boolean(preview?.previewURL);
  const sampleText = preview?.sampleText ?? 'Aa';

  return (
    <button
      type="button"
      className={cn(
        'text-effect-card',
        hasPhoto && 'text-effect-card--photo',
        compact && 'text-effect-card--compact',
        selected && 'text-effect-card--selected',
      )}
      style={hasPhoto ? undefined : { background: cfg.previewBg }}
      onClick={onClick}
      title={cfg.label}
    >
      {hasPhoto && (
        <>
          <img
            src={preview!.previewURL}
            alt=""
            className="text-effect-card-bg"
            loading="lazy"
            draggable={false}
          />
          <span className="text-effect-card-scrim" aria-hidden />
        </>
      )}
      <span className="text-effect-card-preview" style={textEffectPreviewCss(cfg, effectId)}>
        {sampleText}
      </span>
      <span className="text-effect-card-label">{cfg.label}</span>
      {!compact && <Sparkles size={10} className="text-effect-card-icon" />}
    </button>
  );
}
