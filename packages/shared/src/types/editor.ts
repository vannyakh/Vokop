import type { StudioToolId } from '../types/studio.js';
import type { CaptionStyle } from '../types/export.js';

export interface EditorPreset {
  id: string;
  label: string;
  description?: string;
  /** CSS filter for live browser preview */
  cssFilter?: string;
  /** FFmpeg video filter chain for export/server preview */
  ffmpegFilter?: string;
  /** Tool-specific metadata */
  meta?: Record<string, unknown>;
}

export interface EditorToolCatalog {
  id: StudioToolId;
  label: string;
  presets: EditorPreset[];
}

export interface ApplyEditorEditRequest {
  sessionId: string;
  tool: StudioToolId;
  presetId: string;
  clipId?: string;
  atTime?: number;
}

export interface ApplyEditorEditResponse {
  tool: StudioToolId;
  presetId: string;
  label: string;
  ffmpegFilter?: string;
  cssFilter?: string;
  appliedAt: string;
}

export interface EditorPreviewRequest {
  sessionId: string;
  presetId: string;
  tool: 'filters' | 'effects';
  atTime?: number;
}

export interface EditorPreviewResponse {
  image: string;
  width: number;
  height: number;
  presetId: string;
}

export interface ClipEditState {
  filterId?: string;
  transitionInId?: string;
  transitionOutId?: string;
  effectId?: string;
}

/** Cross-clip transition between adjacent video clips (export / xfade). */
export interface TimelineTransition {
  id: string;
  presetId: string;
  outgoingClipId: string;
  incomingClipId: string;
  durationSec: number;
}

export type CompositionBackgroundMode = 'none' | 'color' | 'blur' | 'image';

/** Letterbox / canvas fill behind scaled video clips (CapCut-style background). */
export interface CompositionBackground {
  mode: CompositionBackgroundMode;
  /** Solid fill when mode is `color`. */
  color?: string;
  /** Blur preset level 0–3 when mode is `blur`. */
  blurLevel?: number;
  /** Built-in gradient/image preset id when mode is `image`. */
  imagePresetId?: string;
  /** Media library asset when mode is `image`. */
  imageAssetId?: string;
}

export const DEFAULT_COMPOSITION_BACKGROUND: CompositionBackground = {
  mode: 'none',
  color: '#000000',
  blurLevel: 0,
};

export interface ProjectEditorState {
  videoFilterId: string | null;
  captionStyle: CaptionStyle;
  captionScale: number;
  clipEdits: Record<string, ClipEditState>;
  timelineTransitions: TimelineTransition[];
  compositionBackground: CompositionBackground;
}

export const DEFAULT_PROJECT_EDITOR_STATE: ProjectEditorState = {
  videoFilterId: null,
  captionStyle: 'standard',
  captionScale: 1,
  clipEdits: {},
  timelineTransitions: [],
  compositionBackground: { ...DEFAULT_COMPOSITION_BACKGROUND },
};
