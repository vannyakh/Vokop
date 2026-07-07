/**
 * @vokop/editor — Core editor package for the Vokop studio.
 *
 * Provides timeline types, geometry utilities, clip manipulation helpers,
 * editor constants (animations, transitions, filters), and React hooks for
 * drag/trim/selection/playhead interactions.
 *
 * Inspired by Omniclip's editor core patterns (timeline model, trim/split,
 * effect manager, placement utils) adapted for React 19 + Zustand + Vokop's CapCut-style UX.
 * Icons live in `@vokop/ui` (`StudioIcon`, from Omniclip `s/icons`).
 *
 * Reference: https://github.com/omni-media/omniclip
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export * from './types/index.js';

// ─── Utils ───────────────────────────────────────────────────────────────────
export * from './utils/index.js';

// ─── Constants ───────────────────────────────────────────────────────────────
export * from './constants/index.js';

// ─── Gradients (CSS gradient parser + canvas renderer, from OpenCut) ─────────
export * from './gradients/index.js';

// ─── React Hooks ─────────────────────────────────────────────────────────────
export * from './hooks/index.js';
