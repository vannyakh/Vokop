import type { AspectRatioId } from '../constants/aspect-ratios.js';
import type {
  AppliedStudioTemplateState,
  StudioTemplate,
  StudioTemplateAssetBinding,
  StudioTemplateBlueprintCanvasElement,
} from '../types/studioTemplate.js';

const PAD = 24;
const BOTTOM_INSET = 48;

function canvasSizeForAspect(aspectRatio: AspectRatioId): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16':
      return { width: 360, height: 640 };
    case '16:9':
      return { width: 640, height: 360 };
    case '1:1':
      return { width: 400, height: 400 };
    case '4:3':
      return { width: 480, height: 360 };
    case '3:4':
      return { width: 360, height: 480 };
    case '2:1':
      return { width: 640, height: 320 };
    default:
      return { width: 640, height: 360 };
  }
}

function placementForElement(
  element: StudioTemplateBlueprintCanvasElement,
  canvasSize: { width: number; height: number },
) {
  const fontSize = element.fontSize ?? 24;
  const width = Math.min(280, canvasSize.width - PAD * 2);
  const height = fontSize * 1.6;
  let y = PAD;

  if (element.verticalAlign === 'center') {
    y = Math.max(PAD, (canvasSize.height - height) / 2);
  } else if (element.verticalAlign === 'bottom') {
    y = Math.max(PAD, canvasSize.height - BOTTOM_INSET - height);
  }

  return { x: PAD, y, width, height, fontSize };
}

function bindingMap(bindings: StudioTemplateAssetBinding[] = []) {
  return new Map(bindings.map((b) => [b.slotId, b]));
}

function nextId(prefix: string, index: number) {
  return `${prefix}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Instantiate a studio template blueprint, swapping asset slot bindings into clips/elements.
 * Asset-agnostic: slots without bindings are listed in `unfilledSlotIds`.
 */
export function applyStudioTemplate(
  template: StudioTemplate,
  bindings: StudioTemplateAssetBinding[] = [],
): AppliedStudioTemplateState {
  const assets = bindingMap(bindings);
  const canvasSize = canvasSizeForAspect(template.aspectRatio);
  const blueprintClipIds = new Map<string, string>();

  const videoClips = template.blueprint.videoClips.flatMap((clip, index) => {
    if (!clip.slotId) return [];
    const binding = assets.get(clip.slotId);
    if (!binding) return [];

    const id = nextId('video', index);
    if (clip.blueprintId) blueprintClipIds.set(clip.blueprintId, id);

    const duration =
      binding.duration != null && binding.duration > 0
        ? Math.min(clip.duration, binding.duration)
        : clip.duration;

    return [
      {
        id,
        start: clip.start,
        duration,
        sourceStart: clip.sourceStart ?? 0,
        name: binding.name || clip.name || 'Video',
        muted: clip.muted,
      },
    ];
  });

  const audioClips = template.blueprint.audioClips.flatMap((clip, index) => {
    if (!clip.slotId && !clip.linkedBlueprintClipId) return [];
    const binding = clip.slotId ? assets.get(clip.slotId) : undefined;
    if (clip.slotId && !binding) return [];

    const id = nextId('audio', index);
    const linkedVideoClipId = clip.linkedBlueprintClipId
      ? blueprintClipIds.get(clip.linkedBlueprintClipId)
      : undefined;

    return [
      {
        id,
        start: clip.start,
        duration: clip.duration,
        sourceStart: clip.sourceStart ?? 0,
        name: binding?.name || clip.name || 'Audio',
        linkedVideoClipId,
      },
    ];
  });

  const canvasElements = template.blueprint.canvasElements.map((element, index) => {
    const binding = element.slotId ? assets.get(element.slotId) : undefined;
    const placement = placementForElement(element, canvasSize);
    const id = element.type === 'image' ? nextId('image', index) : nextId('template', index);

    return {
      id,
      type: element.type,
      text: element.text,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      fontSize: placement.fontSize,
      rotation: element.rotation ?? 0,
      opacity: element.opacity ?? 1,
      src: binding?.src,
      templateId: element.templateId,
      textStyle: element.textStyle,
      fontFamily: element.fontFamily,
      startTime: element.startTime,
      endTime: element.endTime,
      trackId: element.trackId,
    };
  });

  const unfilledSlotIds = template.slots
    .filter((slot) => {
      if (assets.has(slot.id)) return false;
      const usedInBlueprint =
        template.blueprint.videoClips.some((c) => c.slotId === slot.id) ||
        template.blueprint.audioClips.some((c) => c.slotId === slot.id) ||
        template.blueprint.canvasElements.some((c) => c.slotId === slot.id);
      return usedInBlueprint || slot.required === true;
    })
    .map((slot) => slot.id);

  return {
    videoClips,
    audioClips,
    canvasElements,
    duration: template.durationSec,
    aspectRatio: template.aspectRatio,
    unfilledSlotIds,
  };
}

export function getUnfilledRequiredSlots(
  template: StudioTemplate,
  unfilledSlotIds: string[],
): StudioTemplate['slots'] {
  const pending = new Set(unfilledSlotIds);
  return template.slots.filter((slot) => pending.has(slot.id));
}
