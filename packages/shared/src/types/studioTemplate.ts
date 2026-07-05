import type { AspectRatioId } from '../constants/aspect-ratios.js';
import type { CanvasElementType, CanvasTextStyle } from './canvas.js';

export type StudioTemplateAssetSlotKind = 'video' | 'audio' | 'image';

export interface StudioTemplateAssetSlot {
  id: string;
  kind: StudioTemplateAssetSlotKind;
  label: string;
  required?: boolean;
}

export interface StudioTemplateBlueprintMediaClip {
  /** Blueprint-local id for linking (e.g. audio linked to video). */
  blueprintId?: string;
  slotId?: string;
  start: number;
  duration: number;
  sourceStart?: number;
  name?: string;
  muted?: boolean;
  /** References another blueprint clip id for linked audio. */
  linkedBlueprintClipId?: string;
}

export interface StudioTemplateBlueprintCanvasElement {
  slotId?: string;
  type: CanvasElementType;
  text: string;
  templateId?: string;
  textStyle?: CanvasTextStyle;
  fontSize?: number;
  fontFamily?: string;
  verticalAlign?: 'top' | 'center' | 'bottom';
  startTime: number;
  endTime: number;
  trackId?: string;
  opacity?: number;
  rotation?: number;
}

export interface StudioTemplateBlueprint {
  videoClips: StudioTemplateBlueprintMediaClip[];
  audioClips: StudioTemplateBlueprintMediaClip[];
  canvasElements: StudioTemplateBlueprintCanvasElement[];
  translatedText?: string;
  transcript?: string;
}

export interface StudioTemplate {
  id: string;
  name: string;
  description: string;
  aspectRatio: AspectRatioId;
  durationSec: number;
  categories: string[];
  slots: StudioTemplateAssetSlot[];
  blueprint: StudioTemplateBlueprint;
}

/** Runtime asset bound to a template slot when applying or filling. */
export interface StudioTemplateAssetBinding {
  slotId: string;
  name: string;
  duration?: number;
  src?: string;
}

export interface AppliedStudioTemplateState {
  videoClips: {
    id: string;
    start: number;
    duration: number;
    sourceStart: number;
    name: string;
    muted?: boolean;
    linkedVideoClipId?: string;
  }[];
  audioClips: {
    id: string;
    start: number;
    duration: number;
    sourceStart: number;
    name: string;
    linkedVideoClipId?: string;
  }[];
  canvasElements: {
    id: string;
    type: CanvasElementType;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    rotation: number;
    opacity: number;
    src?: string;
    templateId?: string;
    textStyle?: CanvasTextStyle;
    fontFamily?: string;
    startTime: number;
    endTime: number;
    trackId?: string;
  }[];
  duration: number;
  aspectRatio: AspectRatioId;
  unfilledSlotIds: string[];
}
