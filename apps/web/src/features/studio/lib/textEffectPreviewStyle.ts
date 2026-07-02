import type { CSSProperties } from 'react';
import type { TextEffectConfig } from '@/features/studio/constants/textEffects';
import type { CanvasTextEffectId } from '@/types/canvas';

export function isGlowEffect(effectId: CanvasTextEffectId): boolean {
  return (
    effectId === 'glow-teal' ||
    effectId === 'glow-orange' ||
    effectId === 'neon-pink' ||
    effectId === 'fire' ||
    effectId === 'ice'
  );
}

export function textEffectPreviewCss(
  cfg: TextEffectConfig,
  effectId: CanvasTextEffectId,
): CSSProperties {
  const glow = isGlowEffect(effectId);
  return {
    color: cfg.previewColor,
    textShadow: glow
      ? `0 0 ${cfg.shadowBlur ?? 14}px ${cfg.shadowColor}`
      : cfg.shadowEnabled
        ? `${cfg.shadowOffsetX ?? 0}px ${cfg.shadowOffsetY ?? 3}px ${cfg.shadowBlur ?? 6}px ${cfg.shadowColor}`
        : undefined,
    WebkitTextStroke: cfg.stroke ? `${cfg.strokeWidth ?? 1}px ${cfg.stroke}` : undefined,
  };
}

export function textEffectStyleOverrides(cfg: TextEffectConfig): {
  fill: string;
  fontSize: number;
  fontWeight: 'bold';
  align: 'center';
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
} {
  const style = {
    fill: cfg.fill ?? cfg.previewColor,
    fontSize: 28,
    fontWeight: 'bold' as const,
    align: 'center' as const,
  };

  if (cfg.stroke) {
    return {
      ...style,
      stroke: cfg.stroke,
      strokeWidth: cfg.strokeWidth ?? 2,
      ...(cfg.shadowEnabled
        ? { shadowColor: cfg.shadowColor ?? 'rgba(0,0,0,0.7)', shadowBlur: cfg.shadowBlur ?? 10 }
        : {}),
    };
  }

  if (cfg.shadowEnabled) {
    return {
      ...style,
      shadowColor: cfg.shadowColor ?? 'rgba(0,0,0,0.7)',
      shadowBlur: cfg.shadowBlur ?? 10,
    };
  }

  return style;
}
