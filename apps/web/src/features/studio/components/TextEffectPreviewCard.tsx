import { Sparkles } from 'lucide-react';
import { getTextEffectSeed } from '@vokop/shared';
import { cn } from '@/lib/cn';
import { TEXT_EFFECTS } from '@/features/studio/constants/textEffects';
import { textEffectPreviewCss } from '@/features/studio/lib/textEffectPreviewStyle';
import type { CanvasTextEffectId } from '@/types/canvas';

interface TextEffectPreviewCardProps {
  effectId: CanvasTextEffectId;
  compact?: boolean;
  selected?: boolean;
  onClick: () => void;
}

export function TextEffectPreviewCard({
  effectId,
  compact = false,
  selected = false,
  onClick,
}: TextEffectPreviewCardProps) {
  const cfg = TEXT_EFFECTS[effectId];
  const sampleText = getTextEffectSeed(effectId)?.sampleText ?? 'Aa';

  return (
    <button
      type="button"
      className={cn(
        'text-effect-card',
        compact && 'text-effect-card--compact',
        selected && 'text-effect-card--selected',
      )}
      style={{ background: cfg.previewBg }}
      onClick={onClick}
      title={cfg.label}
    >
      <span className="text-effect-card-preview" style={textEffectPreviewCss(cfg, effectId)}>
        {sampleText}
      </span>
      <span className="text-effect-card-label">{cfg.label}</span>
      {!compact && <Sparkles size={10} className="text-effect-card-icon" />}
    </button>
  );
}
