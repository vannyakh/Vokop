import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { useAppStore } from '@/features/project';
import {
  TEXT_TEMPLATE_DRAG_MIME,
  type TextTemplateInput,
} from '@/features/studio/constants/textTemplates';
import {
  clampCanvasPoint,
  clientToCanvas,
} from '@/features/studio/lib/canvasCoords';
import { computeTemplatePlacement } from '@/features/studio/lib/textTemplatePlacement';
import {
  previewDropHint,
  processTimelineMediaDrop,
} from '@/features/studio/lib/timelineMediaDrop';
import { isTimelineExternalDrag } from '@/features/studio/lib/timelineDrop';

export interface PreviewDropZoneOptions {
  /** Element used for canvas-local drop coordinates (usually the video wrap). */
  getAnchorEl: () => HTMLElement | null;
  cinema?: boolean;
}

export function usePreviewDropZone({ getAnchorEl, cinema = false }: PreviewDropZoneOptions) {
  const [dropActive, setDropActive] = useState(false);
  const [dropHint, setDropHint] = useState('');
  const [externalDrag, setExternalDrag] = useState(false);

  const currentTime = useAppStore((s) => s.currentTime);
  const addTextTemplate = useAppStore((s) => s.addTextTemplate);
  const addMediaAssetToTimeline = useAppStore((s) => s.addMediaAssetToTimeline);
  const ensureTimelineTrackVisible = useAppStore((s) => s.ensureTimelineTrackVisible);
  const importMediaFiles = useAppStore((s) => s.importMediaFiles);

  const dropActions = useMemo(
    () => ({
      ensureTimelineTrackVisible,
      addMediaAssetToTimeline,
      addTextTemplate,
      importMediaFiles,
    }),
    [addMediaAssetToTimeline, addTextTemplate, ensureTimelineTrackVisible, importMediaFiles],
  );

  useEffect(() => {
    const onDragEnter = (e: globalThis.DragEvent) => {
      if (cinema) return;
      const types = Array.from(e.dataTransfer?.types ?? []);
      if (isTimelineExternalDrag(types)) setExternalDrag(true);
    };
    const onDragEnd = () => setExternalDrag(false);

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragend', onDragEnd);
    document.addEventListener('drop', onDragEnd);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragend', onDragEnd);
      document.removeEventListener('drop', onDragEnd);
    };
  }, [cinema]);

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (cinema) return;
      const types = Array.from(e.dataTransfer.types);
      if (!isTimelineExternalDrag(types)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setDropActive(true);
      setDropHint(previewDropHint(types));
    },
    [cinema],
  );

  const onDragLeave = useCallback((e: DragEvent) => {
    const frame = e.currentTarget as HTMLElement;
    if (!frame.contains(e.relatedTarget as Node)) {
      setDropActive(false);
      setDropHint('');
    }
  }, []);

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      setDropHint('');
      setExternalDrag(false);
      if (cinema) return;

      const types = Array.from(e.dataTransfer.types);
      if (!isTimelineExternalDrag(types)) return;

      const anchor = getAnchorEl();
      if (!anchor) return;

      const atTime = Math.max(0, currentTime);
      const templateRaw = e.dataTransfer.getData(TEXT_TEMPLATE_DRAG_MIME);

      if (templateRaw && types.includes(TEXT_TEMPLATE_DRAG_MIME)) {
        let template: TextTemplateInput;
        try {
          template = JSON.parse(templateRaw) as TextTemplateInput;
        } catch {
          return;
        }

        ensureTimelineTrackVisible('text');

        const canvasW = anchor.offsetWidth;
        const canvasH = anchor.offsetHeight;
        const { x, y } = clientToCanvas(anchor, e.clientX, e.clientY);
        const placement = computeTemplatePlacement(template.verticalAlign, template.style.fontSize, {
          width: canvasW,
          height: canvasH,
        });
        const centered = clampCanvasPoint(
          x - placement.width / 2,
          y - placement.height / 2,
          { width: placement.width, height: placement.height },
          { width: canvasW, height: canvasH },
        );

        addTextTemplate(template, {
          x: centered.x,
          y: centered.y,
          startTime: atTime,
          canvasWidth: canvasW,
          canvasHeight: canvasH,
        });
        return;
      }

      await processTimelineMediaDrop({
        dataTransfer: e.dataTransfer,
        atTime,
        autoCreateTrack: true,
        actions: dropActions,
      });
    },
    [
      cinema,
      currentTime,
      addTextTemplate,
      dropActions,
      ensureTimelineTrackVisible,
      getAnchorEl,
    ],
  );

  return {
    dropActive,
    dropHint,
    externalDrag,
    bindDropZone: { onDragOver, onDragLeave, onDrop },
  };
}
