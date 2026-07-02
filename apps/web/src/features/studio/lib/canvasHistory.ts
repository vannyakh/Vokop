import type { CanvasElement } from '@/types/canvas';

const MAX_HISTORY = 50;

export function cloneCanvasElements(elements: CanvasElement[]): CanvasElement[] {
  return structuredClone(elements);
}

export function pushCanvasUndoStack(
  stack: CanvasElement[][],
  snapshot: CanvasElement[],
): CanvasElement[][] {
  return [...stack.slice(-(MAX_HISTORY - 1)), cloneCanvasElements(snapshot)];
}
