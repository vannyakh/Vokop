/**
 * useClipTrim — drag-to-trim handler for clip left/right handles.
 * Adapted from Omniclip's effectTrimHandler.
 *
 * Fires `onTrimUpdate` during drag for live preview, then `onTrimCommit` on drop.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { pxToMs } from '../utils/timeline.js';
import { TIMELINE_MIN_CLIP_MS } from '../constants/layout.js';
import type { AnyClip, TrimSide } from '../types/clip.js';

export interface TrimUpdate {
  clipId: string;
  side: TrimSide;
  /** New source in-point (ms) — only set when trimming the left side */
  newStart?: number;
  /** New source out-point (ms) — only set when trimming the right side */
  newEnd?: number;
  /** New timeline start position (ms) — only set when trimming the left side */
  newStartAtPosition?: number;
}

interface UseClipTrimOptions {
  pxPerSec: number;
  onTrimUpdate: (update: TrimUpdate) => void;
  onTrimCommit: (update: TrimUpdate) => void;
}

interface UseClipTrimResult {
  trimming: boolean;
  /** Call from `onPointerDown` on the left or right trim handle */
  onTrimHandlePointerDown: (
    e: React.PointerEvent,
    clip: AnyClip,
    side: TrimSide,
  ) => void;
}

export function useClipTrim(options: UseClipTrimOptions): UseClipTrimResult {
  const { pxPerSec, onTrimUpdate, onTrimCommit } = options;
  const [trimming, setTrimming] = useState(false);

  const pxPerSecRef = useRef(pxPerSec);
  pxPerSecRef.current = pxPerSec;

  const state = useRef<{
    clip: AnyClip;
    side: TrimSide;
    startClientX: number;
    lastUpdate: TrimUpdate | null;
  } | null>(null);

  const onTrimHandlePointerDown = useCallback(
    (e: React.PointerEvent, clip: AnyClip, side: TrimSide) => {
      e.stopPropagation();
      e.preventDefault();
      state.current = {
        clip,
        side,
        startClientX: e.clientX,
        lastUpdate: null,
      };
      setTrimming(true);
    },
    [],
  );

  useEffect(() => {
    if (!trimming) return;

    const onMove = (e: PointerEvent) => {
      const s = state.current;
      if (!s) return;

      const deltaMs = pxToMs(e.clientX - s.startClientX, pxPerSecRef.current);
      let update: TrimUpdate;

      if (s.side === 'left') {
        const newStart = Math.max(0, s.clip.start + deltaMs);
        const newDuration = s.clip.end - newStart;
        if (newDuration < TIMELINE_MIN_CLIP_MS) return;
        update = {
          clipId: s.clip.id,
          side: 'left',
          newStart,
          newStartAtPosition: Math.max(0, s.clip.start_at_position + deltaMs),
        };
      } else {
        const newEnd = s.clip.end + deltaMs;
        const newDuration = newEnd - s.clip.start;
        if (newDuration < TIMELINE_MIN_CLIP_MS) return;
        update = { clipId: s.clip.id, side: 'right', newEnd };
      }

      s.lastUpdate = update;
      onTrimUpdate(update);
    };

    const onUp = () => {
      if (state.current?.lastUpdate) {
        onTrimCommit(state.current.lastUpdate);
      }
      state.current = null;
      setTrimming(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [trimming, onTrimUpdate, onTrimCommit]);

  return { trimming, onTrimHandlePointerDown };
}
