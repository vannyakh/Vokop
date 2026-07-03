/**
 * Transition types — adapted from Omniclip's transition-manager.
 * Transitions are placed between two adjacent ("touching") clips.
 */

export interface TransitionPreset {
  name: string;
  /** Label shown in UI */
  label: string;
  /** FFmpeg filter expression for server-side export */
  ffmpegFilter?: string;
  /** CSS-based preview class (for real-time browser preview) */
  cssClass?: string;
  /** Default duration in milliseconds */
  defaultDuration: number;
}

export interface AppliedTransition {
  id: string;
  /** Preset name */
  name: string;
  /** Clip that is being left (ends before transition midpoint) */
  outgoingClipId: string;
  /** Clip that is being entered (starts at transition midpoint) */
  incomingClipId: string;
  /** Duration of the overlap in milliseconds */
  duration: number;
}

/** A pair of adjacent clips that can have a transition applied */
export interface TouchingClipPair {
  outgoing: { id: string; end: number; start_at_position: number; track: number };
  incoming: { id: string; start: number; start_at_position: number; track: number };
}
