/**
 * useAnimations — in/out animation management hook for clips.
 * Adapted from Omniclip's animationManager.
 *
 * Manages entrance (in) and exit (out) animations on image/video clips.
 */

import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_ANIMATION_DURATION_MS } from '../constants/animations.js';
import type { ClipAnimation, AnimationType } from '../types/animation.js';
import type { AnyClip } from '../types/clip.js';

interface UseAnimationsOptions {
  /** All applied animations from the project store */
  animations: ClipAnimation[];
  /** Duration of a single frame in ms */
  frameDurationMs: number;
  onApplyAnimation: (animation: ClipAnimation) => void;
  onRemoveAnimation: (id: string) => void;
  onUpdateAnimationDuration: (id: string, durationMs: number) => void;
}

interface UseAnimationsResult {
  /** Active panel tab */
  activeKind: AnimationType;
  setActiveKind: (kind: AnimationType) => void;
  /** Check if an animation is selected for a clip */
  isSelected: (clip: AnyClip | null, name: string, type: AnimationType) => boolean;
  /** Check if any "in" animation is applied for a clip */
  hasInAnimation: (clip: AnyClip | null) => boolean;
  /** Check if any "out" animation is applied for a clip */
  hasOutAnimation: (clip: AnyClip | null) => boolean;
  /** Get animation duration for a clip (falls back to default) */
  getAnimationDuration: (clip: AnyClip | null, type: AnimationType) => number;
  /** Select and apply an animation */
  selectAnimation: (clip: AnyClip, name: string, type: AnimationType, durationMs?: number) => void;
  /** Remove animation of a specific type for a clip */
  removeAnimation: (clip: AnyClip, type: AnimationType) => void;
  /** Update duration for an animation */
  updateDuration: (clip: AnyClip, type: AnimationType, durationMs: number) => void;
}

export function useAnimations(options: UseAnimationsOptions): UseAnimationsResult {
  const { animations, frameDurationMs, onApplyAnimation, onRemoveAnimation, onUpdateAnimationDuration } = options;
  const [activeKind, setActiveKind] = useState<AnimationType>('in');

  const isSelected = useCallback(
    (clip: AnyClip | null, name: string, type: AnimationType): boolean => {
      if (!clip) return false;
      return animations.some(
        (a) => a.targetClipId === clip.id && a.name === name && a.type === type,
      );
    },
    [animations],
  );

  const hasInAnimation = useCallback(
    (clip: AnyClip | null): boolean => {
      if (!clip) return false;
      return animations.some((a) => a.targetClipId === clip.id && a.type === 'in');
    },
    [animations],
  );

  const hasOutAnimation = useCallback(
    (clip: AnyClip | null): boolean => {
      if (!clip) return false;
      return animations.some((a) => a.targetClipId === clip.id && a.type === 'out');
    },
    [animations],
  );

  const getAnimationDuration = useCallback(
    (clip: AnyClip | null, type: AnimationType): number => {
      if (!clip) return DEFAULT_ANIMATION_DURATION_MS;
      const found = animations.find(
        (a) => a.targetClipId === clip.id && a.type === type,
      );
      return found?.duration ?? DEFAULT_ANIMATION_DURATION_MS;
    },
    [animations],
  );

  const selectAnimation = useCallback(
    (clip: AnyClip, name: string, type: AnimationType, durationMs?: number) => {
      const existing = animations.find(
        (a) => a.targetClipId === clip.id && a.type === type,
      );
      const duration =
        durationMs ??
        existing?.duration ??
        DEFAULT_ANIMATION_DURATION_MS;

      const id = existing?.id ?? `anim-${Date.now()}`;
      const animation: ClipAnimation = {
        id,
        targetClipId: clip.id,
        type,
        name,
        duration,
        for: 'Animation',
      };
      onApplyAnimation(animation);
    },
    [animations, onApplyAnimation],
  );

  const removeAnimation = useCallback(
    (clip: AnyClip, type: AnimationType) => {
      const found = animations.find(
        (a) => a.targetClipId === clip.id && a.type === type,
      );
      if (found) onRemoveAnimation(found.id);
    },
    [animations, onRemoveAnimation],
  );

  const updateDuration = useCallback(
    (clip: AnyClip, type: AnimationType, durationMs: number) => {
      const found = animations.find(
        (a) => a.targetClipId === clip.id && a.type === type,
      );
      if (found) {
        const snapped = Math.round(durationMs / frameDurationMs) * frameDurationMs;
        onUpdateAnimationDuration(found.id, snapped);
      }
    },
    [animations, frameDurationMs, onUpdateAnimationDuration],
  );

  return {
    activeKind,
    setActiveKind,
    isSelected,
    hasInAnimation,
    hasOutAnimation,
    getAnimationDuration,
    selectAnimation,
    removeAnimation,
    updateDuration,
  };
}
