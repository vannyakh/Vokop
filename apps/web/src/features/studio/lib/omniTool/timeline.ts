import type { Media } from '@omnimedia/omnitool';
import { getOmni } from '@/features/studio/lib/omniTool/client';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

function secToMs(sec: number): number {
  return Math.max(0, Math.round(sec * 1000));
}

/**
 * Build an Omnitool timeline from Vokop video clips (seconds → ms).
 * Gaps between clips become explicit `gap` items so playhead mapping stays aligned.
 */
export async function buildOmniTimelineFromVideoClips(media: Media, clips: MediaClip[]) {
  const omni = await getOmni();
  const ordered = [...clips].sort((a, b) => a.start - b.start);

  return omni.timeline((o) => {
    if (ordered.length === 0) {
      return o.video(media, {
        start: 0,
        duration: media.duration || 1000,
        label: 'Video',
      });
    }

    const items: Array<ReturnType<typeof o.video> | ReturnType<typeof o.gap>> = [];
    let cursorMs = 0;

    for (const clip of ordered) {
      const startMs = secToMs(clip.start);
      if (startMs > cursorMs) {
        items.push(o.gap(startMs - cursorMs));
      }

      items.push(
        o.video(media, {
          start: secToMs(clip.sourceStart),
          duration: secToMs(clip.duration),
          label: clip.name,
        }),
      );
      cursorMs = startMs + secToMs(clip.duration);
    }

    return o.sequence(...items);
  });
}
