import type { MediaClip } from '@/features/studio/lib/timelineTypes';

export const CLIP_VOLUME_PRESETS = [0, 25, 50, 75, 100, 125, 150] as const;
export const CLIP_FADE_PRESETS = [0, 0.25, 0.5, 1, 1.5, 2] as const;

export const CLIP_LEVEL_PRESETS = [
  { id: 'normal', label: 'Normal', volume: 1, fadeInSec: 0, fadeOutSec: 0 },
  { id: 'boost', label: 'Boost', volume: 1.35, fadeInSec: 0, fadeOutSec: 0 },
  { id: 'quiet', label: 'Quiet', volume: 0.45, fadeInSec: 0, fadeOutSec: 0 },
  { id: 'fade', label: 'Fade in/out', volume: 1, fadeInSec: 0.35, fadeOutSec: 0.35 },
  { id: 'mute', label: 'Mute clip', volume: 0, fadeInSec: 0, fadeOutSec: 0 },
] as const;

export function clipVolumeValue(clip: MediaClip): number {
  return clip.volume ?? 1;
}

/**
 * Linear envelope (0-1) for a fade-in/fade-out ramp at `timelineTime`, given
 * a clip's placement on the timeline. Shared by audio volume fades and video
 * opacity fades so both ramp identically.
 */
export function computeFadeEnvelope(
  timelineTime: number,
  clipStart: number,
  clipDuration: number,
  fadeInSec: number,
  fadeOutSec: number,
): number {
  const clipEnd = clipStart + clipDuration;
  const fadeIn = Math.max(0, fadeInSec);
  const fadeOut = Math.max(0, fadeOutSec);

  if (timelineTime < clipStart || timelineTime > clipEnd) return 0;

  let envelope = 1;
  if (fadeIn > 0 && timelineTime < clipStart + fadeIn) {
    envelope *= (timelineTime - clipStart) / fadeIn;
  }
  if (fadeOut > 0 && timelineTime > clipEnd - fadeOut) {
    envelope *= Math.max(0, (clipEnd - timelineTime) / fadeOut);
  }

  return Math.min(1, Math.max(0, envelope));
}

/** Effective linear gain at timeline time (0–2), including fades and mute flags. */
export function effectiveClipVolume(
  clip: MediaClip,
  timelineTime: number,
  trackMuted = false,
): number {
  if (trackMuted || clip.muted) return 0;

  const gain = clipVolumeValue(clip);
  const envelope = computeFadeEnvelope(
    timelineTime,
    clip.start,
    clip.duration,
    clip.fadeInSec ?? 0,
    clip.fadeOutSec ?? 0,
  );

  return Math.min(2, Math.max(0, gain * envelope));
}

/** Stereo pan as left/right channel multipliers (simple balance). */
export function stereoPanMultipliers(pan: number): { left: number; right: number } {
  const p = Math.min(1, Math.max(-1, pan));
  if (p === 0) return { left: 1, right: 1 };
  if (p < 0) return { left: 1, right: 1 + p };
  return { left: 1 - p, right: 1 };
}

export function describeAudioSource(clip: MediaClip): string {
  if (clip.linkedVideoClipId) return 'From video';
  if (clip.mediaAssetId) return 'Imported file';
  return 'AI voiceover';
}
