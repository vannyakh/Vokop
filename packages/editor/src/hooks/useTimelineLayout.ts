/**
 * useTimelineLayout — computes all pixel geometry for the timeline canvas.
 * Adapted from Omniclip's timeline width/position calculations.
 *
 * Produces:
 *  - pxPerSec (zoom-adjusted)
 *  - timelineContentWidth
 *  - playheadX
 *  - rulerTicks
 *  - trackTops / totalHeight
 */

import { useMemo } from 'react';
import {
  effectivePxPerSec,
  calculateTimelineWidth,
  getRulerTicks,
  buildTrackTops,
  totalTracksHeight,
  timeToPx,
} from '../utils/timeline.js';
import {
  TIMELINE_BASE_PX_PER_SEC,
  TRACK_HEIGHT,
} from '../constants/layout.js';
import type { AnyClip, TimelineTrack } from '../types/clip.js';

interface UseTimelineLayoutOptions {
  clips: AnyClip[];
  tracks: TimelineTrack[];
  /** Duration of the project in seconds */
  durationSeconds: number;
  /** Current playhead position in seconds */
  currentTimeSeconds: number;
  /** Zoom percentage (100 = default, 200 = 2× zoom in) */
  zoomPercent: number;
  /** Available container width in pixels */
  containerWidth: number;
}

interface TimelineLayoutResult {
  /** Effective pixels-per-second at current zoom */
  pxPerSec: number;
  /** Total scrollable width of the timeline canvas in pixels */
  timelineContentWidth: number;
  /** Playhead X position in pixels */
  playheadX: number;
  /** Ruler tick positions in seconds */
  rulerTicks: number[];
  /** Top offset in pixels for each track (indexed by track.index) */
  trackTops: number[];
  /** Total scrollable height of the tracks area in pixels */
  totalHeight: number;
}

export function useTimelineLayout(options: UseTimelineLayoutOptions): TimelineLayoutResult {
  const {
    clips,
    tracks,
    durationSeconds,
    currentTimeSeconds,
    zoomPercent,
    containerWidth,
  } = options;

  const pxPerSec = useMemo(
    () => (TIMELINE_BASE_PX_PER_SEC * zoomPercent) / 100,
    [zoomPercent],
  );

  const timelineContentWidth = useMemo(
    () => Math.max(containerWidth || 640, timeToPx(durationSeconds || 1, pxPerSec) + 80),
    [durationSeconds, pxPerSec, containerWidth],
  );

  const playheadX = useMemo(
    () => timeToPx(currentTimeSeconds, pxPerSec),
    [currentTimeSeconds, pxPerSec],
  );

  const rulerTicks = useMemo(
    () => getRulerTicks(durationSeconds, pxPerSec),
    [durationSeconds, pxPerSec],
  );

  const trackHeightList = useMemo(
    () => tracks.map((t) => TRACK_HEIGHT[t.kind] ?? 40),
    [tracks],
  );

  const trackTops = useMemo(() => buildTrackTops(trackHeightList), [trackHeightList]);

  const totalHeight = useMemo(() => totalTracksHeight(trackHeightList), [trackHeightList]);

  return { pxPerSec, timelineContentWidth, playheadX, rulerTicks, trackTops, totalHeight };
}
