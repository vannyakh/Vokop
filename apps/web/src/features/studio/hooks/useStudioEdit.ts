import { useMemo } from 'react';
import {
  studioEdit,
  type StudioEditOptions,
  type VideoTransformPatch,
} from '@/features/studio/services/studioEdit';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import type { CanvasElement } from '@/types/canvas';

/**
 * React-facing studio edit API (media clips, canvas elements, video frame).
 * Prefer this over calling many store actions from components.
 */
export function useStudioEdit() {
  return useMemo(
    () => ({
      updateMediaClip: (
        id: string,
        patch: Partial<MediaClip>,
        options?: StudioEditOptions,
      ) => studioEdit.updateMediaClip(id, patch, options),

      updateCanvasElement: (
        id: string,
        patch: Partial<CanvasElement>,
        options?: StudioEditOptions,
      ) => studioEdit.updateCanvasElement(id, patch, options),

      updateVideoTransform: (
        clipId: string,
        transform: VideoTransformPatch,
        options?: StudioEditOptions,
      ) => studioEdit.updateVideoTransform(clipId, transform, options),

      updateCanvasTiming: (
        clipId: string,
        timing: { startTime: number; endTime: number },
        options?: StudioEditOptions,
      ) => studioEdit.updateCanvasTiming(clipId, timing, options),

      focusVideoClip: (clipId: string, options?: { openInspector?: boolean }) =>
        studioEdit.focusVideoClip(clipId, options),

      focusCanvasElement: (id: string) => studioEdit.focusCanvasElement(id),

      clearFocus: () => studioEdit.clearFocus(),

      commitHistory: () => studioEdit.commitHistory(),

      canSplitAtPlayhead: () => studioEdit.canSplitAtPlayhead(),
      splitAtPlayhead: () => studioEdit.splitAtPlayhead(),

      extractAudioFromVideo: (clipId?: string) =>
        studioEdit.extractAudioFromVideo(clipId),
      detachAudioFromVideo: (clipId?: string) =>
        studioEdit.detachAudioFromVideo(clipId),
    }),
    [],
  );
}
