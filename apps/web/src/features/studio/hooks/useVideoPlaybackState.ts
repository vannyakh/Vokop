import { useAppStore } from '@/features/project';

/** Timeline-aware play/pause/seek (maps playhead ↔ media source via videoClips). */
export function useVideoPlaybackState() {
  const isTimelinePlaying = useAppStore((s) => s.isTimelinePlaying);
  const toggleTimelinePlaying = useAppStore((s) => s.toggleTimelinePlaying);
  const seekTimeline = useAppStore((s) => s.seekTimeline);

  return {
    isPaused: !isTimelinePlaying,
    togglePlay: toggleTimelinePlaying,
    seek: seekTimeline,
  };
}
