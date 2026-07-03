/**
 * Filter types — adapted from Omniclip's filter-manager + Vokop's editor presets.
 * Filters are applied to video or image clips for real-time preview and export.
 */

export type FilterPropertyType = 'number' | 'color' | 'boolean' | 'choice' | 'object' | 'array';

export interface FilterPropertyBase {
  type: FilterPropertyType;
  label?: string;
}

export interface NumberFilterProperty extends FilterPropertyBase {
  type: 'number';
  min: number;
  max: number;
  default: number;
  step?: number;
}

export interface ColorFilterProperty extends FilterPropertyBase {
  type: 'color';
  default: string;
}

export interface BooleanFilterProperty extends FilterPropertyBase {
  type: 'boolean';
  default: boolean;
}

export interface ChoiceFilterProperty extends FilterPropertyBase {
  type: 'choice';
  options: string[] | Record<string, string>;
  default: string;
}

export interface ObjectFilterProperty extends FilterPropertyBase {
  type: 'object';
  properties: Record<string, FilterPropertyConfig>;
}

export interface ArrayFilterProperty extends FilterPropertyBase {
  type: 'array';
  items: FilterPropertyConfig[];
}

export type FilterPropertyConfig =
  | NumberFilterProperty
  | ColorFilterProperty
  | BooleanFilterProperty
  | ChoiceFilterProperty
  | ObjectFilterProperty
  | ArrayFilterProperty;

export interface FilterPreset {
  id: string;
  label: string;
  description?: string;
  /** CSS filter string for live browser preview */
  cssFilter?: string;
  /** FFmpeg video filter chain for export */
  ffmpegFilter?: string;
  /** Additional configurable properties (e.g. brightness, saturation sliders) */
  properties?: Record<string, FilterPropertyConfig>;
}

/** A filter instance applied to a specific clip */
export interface AppliedFilter {
  id: string;
  targetClipId: string;
  presetId: string;
  /** Per-property overrides from the preset defaults */
  propertyValues?: Record<string, unknown>;
}
