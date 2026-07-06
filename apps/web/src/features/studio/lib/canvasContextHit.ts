import type Konva from 'konva';
import { VIDEO_PROXY_ID_PREFIX, isVideoProxyId } from '@/features/studio/lib/videoClipLayout';

export type CanvasContextHit =
  | { kind: 'video'; clipId: string }
  | { kind: 'element'; elementId: string }
  | { kind: 'background' };

/** Walk Konva node tree from the event target to find a video proxy or canvas element. */
export function resolveCanvasContextHit(
  target: Konva.Node,
  stage: Konva.Stage,
  canvasElementIds: Iterable<string>,
): CanvasContextHit {
  const ids = canvasElementIds instanceof Set ? canvasElementIds : new Set(canvasElementIds);
  let node: Konva.Node | null = target;

  while (node && node !== stage) {
    const id = node.id() || node.name();
    if (isVideoProxyId(id)) {
      return { kind: 'video', clipId: id.slice(VIDEO_PROXY_ID_PREFIX.length) };
    }
    if (ids.has(id)) {
      return { kind: 'element', elementId: id };
    }
    node = node.parent;
  }

  return { kind: 'background' };
}
