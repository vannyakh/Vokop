import { useEffect, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { findClipAtTime } from '@/features/studio/lib/mediaClips';
import { bindTimelineVideo } from '@/features/studio/lib/timelinePlaybackBridge';

/**
 * Drives timeline playhead ↔ media source mapping.
 * `currentTime` in the store is always the timeline playhead, not video.currentTime.
 */
export function useTimelinePlayback(videoRef: RefObject<HTMLVideoElement | null>) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const isTimelinePlaying = useAppStore((s) => s.isTimelinePlaying);

  useEffect(() => {
    bindTimelineVideo(videoRef.current);
    return () => bindTimelineVideo(null);
  }, [videoRef, videoUrl]);

  useEffect(() => {
    if (!isTimelinePlaying) {
      const video = videoRef.current;
      if (video && !video.paused) video.pause();
      return;
    }

    let raf = 0;
    let lastNow = performance.now();
    let lastClipId: string | null = null;

    const tick = (now: number) => {
      const state = useAppStore.getState();
      if (!state.isTimelinePlaying) return;

      const video = videoRef.current;
      const clips = state.videoClips;
      const duration = state.duration;
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;

      let timelineTime = state.currentTime;
      const clip = findClipAtTime(clips, timelineTime);

      if (clip && video && state.videoUrl) {
        const sourceTarget = clip.sourceStart + (timelineTime - clip.start);
        const clipChanged = clip.id !== lastClipId;
        lastClipId = clip.id;

        if (clipChanged || Math.abs(video.currentTime - sourceTarget) > 0.3) {
          video.currentTime = sourceTarget;
        }

        if (video.paused) {
          void video.play().catch(() => {
            useAppStore.setState({ isTimelinePlaying: false });
          });
          timelineTime += dt;
        } else {
          timelineTime = clip.start + (video.currentTime - clip.sourceStart);
        }

        if (timelineTime >= clip.start + clip.duration) {
          timelineTime = clip.start + clip.duration;
          lastClipId = null;
          video.pause();
        }
      } else {
        lastClipId = null;
        if (video && !video.paused) video.pause();
        timelineTime += dt;
      }

      if (duration > 0 && timelineTime >= duration) {
        useAppStore.setState({ currentTime: duration, isTimelinePlaying: false });
        video?.pause();
        return;
      }

      if (Math.abs(timelineTime - state.currentTime) > 0.001) {
        useAppStore.setState({ currentTime: timelineTime });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isTimelinePlaying, videoRef, videoUrl]);
}
