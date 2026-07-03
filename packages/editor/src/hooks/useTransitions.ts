/**
 * useTransitions — transition management hook.
 * Adapted from Omniclip's transitionManager.
 *
 * Tracks the selected transition preset and manages applied transitions between
 * adjacent (touching) clip pairs.
 */

import { useCallback, useMemo, useState } from 'react';
import { findTouchingClipPairs, calculateMaxTransitionDuration, normalizeTransitionDuration } from '../utils/clips.js';
import { findTransitionPreset, DEFAULT_TRANSITION_DURATION_MS } from '../constants/transitions.js';
import type { AnyClip } from '../types/clip.js';
import type { AppliedTransition, TouchingClipPair } from '../types/transition.js';

interface UseTransitionsOptions {
  clips: AnyClip[];
  /** Current frame duration in ms (e.g. 1000/30 ≈ 33.33) */
  frameDurationMs: number;
  /** Applied transitions from store */
  transitions: AppliedTransition[];
  onApplyTransition: (transition: AppliedTransition) => void;
  onRemoveTransition: (id: string) => void;
  onUpdateTransition: (id: string, update: Partial<AppliedTransition>) => void;
}

interface UseTransitionsResult {
  /** Adjacent clip pairs that can have a transition applied */
  touchingPairs: TouchingClipPair[];
  /** Currently selected transition ID (null = none) */
  selectedId: string | null;
  /** Select and apply a transition to the selected pair */
  selectTransition: (
    presetName: string,
    outgoingClipId: string,
    incomingClipId: string,
  ) => void;
  /** Deselect / remove the selected transition */
  removeSelected: () => void;
  /** Update duration of a transition */
  updateDuration: (id: string, durationMs: number) => void;
  /** Max valid duration for the currently selected transition */
  maxDurationMs: number;
  /** Get applied transition for a specific clip pair */
  getTransitionForPair: (outgoingId: string, incomingId: string) => AppliedTransition | undefined;
}

export function useTransitions(options: UseTransitionsOptions): UseTransitionsResult {
  const {
    clips,
    frameDurationMs,
    transitions,
    onApplyTransition,
    onRemoveTransition,
    onUpdateTransition,
  } = options;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const touchingPairs = useMemo(() => findTouchingClipPairs(clips), [clips]);

  const selectedTransition = useMemo(
    () => transitions.find((t) => t.id === selectedId),
    [transitions, selectedId],
  );

  const maxDurationMs = useMemo(() => {
    if (!selectedTransition) return 0;
    const outClip = clips.find((c) => c.id === selectedTransition.outgoingClipId);
    const inClip = clips.find((c) => c.id === selectedTransition.incomingClipId);
    return calculateMaxTransitionDuration(outClip, inClip);
  }, [selectedTransition, clips]);

  const selectTransition = useCallback(
    (presetName: string, outgoingClipId: string, incomingClipId: string) => {
      const preset = findTransitionPreset(presetName);
      if (!preset) return;

      const duration = normalizeTransitionDuration(
        preset.defaultDuration || DEFAULT_TRANSITION_DURATION_MS,
        frameDurationMs,
      );

      const existing = transitions.find(
        (t) => t.outgoingClipId === outgoingClipId && t.incomingClipId === incomingClipId,
      );

      const id = existing?.id ?? `trans-${Date.now()}`;
      const applied: AppliedTransition = {
        id,
        name: presetName,
        outgoingClipId,
        incomingClipId,
        duration,
      };

      onApplyTransition(applied);
      setSelectedId(id);
    },
    [transitions, frameDurationMs, onApplyTransition],
  );

  const removeSelected = useCallback(() => {
    if (selectedId) {
      onRemoveTransition(selectedId);
      setSelectedId(null);
    }
  }, [selectedId, onRemoveTransition]);

  const updateDuration = useCallback(
    (id: string, durationMs: number) => {
      const snapped = normalizeTransitionDuration(durationMs, frameDurationMs);
      onUpdateTransition(id, { duration: snapped });
    },
    [frameDurationMs, onUpdateTransition],
  );

  const getTransitionForPair = useCallback(
    (outgoingId: string, incomingId: string) =>
      transitions.find(
        (t) => t.outgoingClipId === outgoingId && t.incomingClipId === incomingId,
      ),
    [transitions],
  );

  return {
    touchingPairs,
    selectedId,
    selectTransition,
    removeSelected,
    updateDuration,
    maxDurationMs,
    getTransitionForPair,
  };
}
