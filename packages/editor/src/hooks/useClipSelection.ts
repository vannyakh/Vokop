/**
 * useClipSelection — multi-select logic for timeline clips.
 * Supports single click, Shift+click range select, and Ctrl/Cmd+click toggle.
 * Adapted from Omniclip's selection patterns + Vokop marquee logic.
 */

import { useCallback, useRef } from 'react';
import type { AnyClip } from '../types/clip.js';

export interface ClipSelectionState {
  selected: Set<string>;
  primary: string | null;
}

interface UseClipSelectionOptions {
  clips: AnyClip[];
  onSelectionChange: (selected: Set<string>, primary: string | null) => void;
}

interface UseClipSelectionResult {
  /** Call on clip click — handles modifier keys for multi-select */
  onClipClick: (e: React.MouseEvent, clipId: string) => void;
  /** Call on backdrop click to clear selection */
  onClearSelection: () => void;
  /** Build a marquee selection from a pixel rect on the timeline */
  selectFromMarquee: (options: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    pxPerSec: number;
    trackTops: number[];
    trackHeights: number[];
  }) => void;
}

export function useClipSelection(
  options: UseClipSelectionOptions,
): UseClipSelectionResult {
  const { clips, onSelectionChange } = options;
  const selectionRef = useRef<ClipSelectionState>({ selected: new Set(), primary: null });

  const emit = useCallback(
    (next: ClipSelectionState) => {
      selectionRef.current = next;
      onSelectionChange(next.selected, next.primary);
    },
    [onSelectionChange],
  );

  const onClipClick = useCallback(
    (e: React.MouseEvent, clipId: string) => {
      const { selected, primary } = selectionRef.current;
      const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;

      if (!isMulti) {
        emit({ selected: new Set([clipId]), primary: clipId });
        return;
      }

      if (e.shiftKey && primary) {
        const orderedIds = [...clips]
          .sort((a, b) => a.start_at_position - b.start_at_position)
          .map((c) => c.id);
        const i1 = orderedIds.indexOf(primary);
        const i2 = orderedIds.indexOf(clipId);
        const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
        const range = new Set(orderedIds.slice(lo, hi + 1));
        emit({ selected: range, primary: clipId });
        return;
      }

      // Ctrl/Cmd toggle
      const next = new Set(selected);
      if (next.has(clipId)) {
        next.delete(clipId);
        emit({ selected: next, primary: next.size > 0 ? [...next].at(-1)! : null });
      } else {
        next.add(clipId);
        emit({ selected: next, primary: clipId });
      }
    },
    [clips, emit],
  );

  const onClearSelection = useCallback(() => {
    emit({ selected: new Set(), primary: null });
  }, [emit]);

  const selectFromMarquee = useCallback(
    (opts: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      pxPerSec: number;
      trackTops: number[];
      trackHeights: number[];
    }) => {
      const { x1, y1, x2, y2, pxPerSec } = opts;
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);

      const msLeft = (left / pxPerSec) * 1000;
      const msRight = (right / pxPerSec) * 1000;

      const hit = clips.filter((c) => {
        const cStart = c.start_at_position;
        const cEnd = c.start_at_position + (c.end - c.start);
        const overlapTime = cStart < msRight && cEnd > msLeft;

        const trackTop = opts.trackTops[c.track] ?? 0;
        const trackBottom = trackTop + (opts.trackHeights[c.track] ?? 40);
        const overlapY = trackTop < bottom && trackBottom > top;

        return overlapTime && overlapY;
      });

      const ids = new Set(hit.map((c) => c.id));
      emit({ selected: ids, primary: hit.at(-1)?.id ?? null });
    },
    [clips, emit],
  );

  return { onClipClick, onClearSelection, selectFromMarquee };
}
