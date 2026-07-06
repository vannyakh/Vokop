/**
 * Shared canvas / footage edit actions used by the context menu and selection toolbar.
 */

import { useAppStore } from '@/features/project';
import { studioEdit } from '@/features/studio/services/studioEdit';
import type { CanvasElement } from '@/types/canvas';

const FRAME_FILL_TRANSFORM = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
} as const;

export function openMediaPanel(): void {
  const store = useAppStore.getState();
  store.setActiveStudioTool('media');
  store.setToolsDrawerOpen(true);
}

export function resetVideoTransform(clipId: string): void {
  studioEdit.updateVideoTransform(clipId, { ...FRAME_FILL_TRANSFORM }, { history: true });
}

export function toggleVideoFlip(clipId: string, axis: 'x' | 'y'): void {
  const clip = useAppStore.getState().videoClips.find((c) => c.id === clipId);
  if (!clip) return;
  studioEdit.updateVideoTransform(
    clipId,
    axis === 'x' ? { flipX: !clip.flipX } : { flipY: !clip.flipY },
    { history: true },
  );
}

export function toggleElementFlip(elementId: string, axis: 'x' | 'y'): void {
  const element = useAppStore.getState().canvasElements.find((el) => el.id === elementId);
  if (!element) return;
  studioEdit.updateCanvasElement(
    elementId,
    axis === 'x' ? { flipX: !element.flipX } : { flipY: !element.flipY },
    { history: true },
  );
}

export function focusVideoForCrop(clipId: string): void {
  studioEdit.focusVideoClip(clipId, { openInspector: false });
}

export function focusElementForCrop(elementId: string): void {
  studioEdit.focusCanvasElement(elementId);
}

export function addImageTrackAtPlayhead(): void {
  const t = useAppStore.getState().currentTime;
  useAppStore.getState().addTimelineClip('image', t);
}

export function addStickerTrackAtPlayhead(): void {
  const t = useAppStore.getState().currentTime;
  useAppStore.getState().addTimelineClip('sticker', t);
}

export function addCaptionAtPlayhead(): void {
  const t = useAppStore.getState().currentTime;
  useAppStore.getState().addTimelineClip('text', t);
}

export function isTextElement(element: CanvasElement | undefined): boolean {
  return element?.type === 'text' || element?.type === 'overlay';
}

export function isImageElement(element: CanvasElement | undefined): boolean {
  return element?.type === 'logo' || element?.type === 'image';
}

export function isVisualElement(element: CanvasElement | undefined): boolean {
  return isImageElement(element);
}

export function contextMenuTitle(
  kind: 'video' | 'element' | 'background',
  element: CanvasElement | undefined,
): string {
  if (kind === 'video') return 'Video footage';
  if (kind === 'background') return 'Canvas';
  if (isTextElement(element)) return 'Text';
  if (element?.type === 'logo') return 'Logo';
  if (element?.type === 'image') return 'Image';
  return 'Layer';
}
