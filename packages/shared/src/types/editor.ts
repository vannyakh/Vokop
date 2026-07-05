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

export interface ProjectEditorState {
  videoFilterId: string | null;
  captionStyle: CaptionStyle;
  captionScale: number;
  clipEdits: Record<string, ClipEditState>;
  timelineTransitions: TimelineTransition[];
}

export const DEFAULT_PROJECT_EDITOR_STATE: ProjectEditorState = {
  videoFilterId: null,
  captionStyle: 'standard',
  captionScale: 1,
  clipEdits: {},
  timelineTransitions: [],
};
