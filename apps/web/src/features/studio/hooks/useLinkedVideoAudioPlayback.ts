import { useEffect, useRef, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { findClipAtTime, findVideoClipForPreview, listVideoTrackIds } from '@/features/studio/lib/mediaClips';

/**
 * Plays audio clips extracted/detached from video (linkedVideoClipId),
 * and mutes the preview video when a video clip is marked muted.
 */
export function useLinkedVideoAudioPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
) {
  const audioRef = useRef<HTMLVideoElement | null>(null);
  const videoUrl = useAppStore((s) => s.videoUrl);

  useEffect(() => {
    const el = document.createElement('video');
    el.preload = 'auto';
    el.playsInline = true;
    el.setAttribute('aria-hidden', 'true');
    el.style.display = 'none';
    document.body.appendChild(el);
    audioRef.current = el;
    return () => {
      el.pause();
      el.removeAttribute('src');
      el.load();
      el.remove();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (videoUrl) {
      if (audio.src !== videoUrl) {
        audio.src = videoUrl;
        audio.load();
      }
    } else {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }, [videoUrl]);

  useEffect(() => {
    const sync = () => {
      const state = useAppStore.getState();
      const video = videoRef.current;
      const audio = audioRef.current;
      if (!video) return;

      const videoTrackIds = listVideoTrackIds(
        state.extraTimelineTracks,
        state.timelineTrackOrder,
        state.timelineTrackHidden,
      );
      const vClip = findVideoClipForPreview(
        state.videoClips,
        state.currentTime,
        videoTrackIds,
        state.timelineTrackPreviewHidden,
      );
      const videoTrackId = vClip?.trackId ?? 'video';
      const videoTrackMuted = state.timelineTrackMuted[videoTrackId] ?? false;
      video.muted = videoTrackMuted || Boolean(vClip?.muted);

      if (!audio || !state.videoUrl) return;

      const aClip = findClipAtTime(state.audioClips, state.currentTime);
      const audioTrackMuted = state.timelineTrackMuted.audio ?? false;
      const linked = Boolean(aClip?.linkedVideoClipId);

      if (!linked || audioTrackMuted || !aClip) {
        if (!audio.paused) audio.pause();
        return;
      }

      const sourceTarget = aClip.sourceStart + (state.currentTime - aClip.start);
      if (Math.abs(audio.currentTime - sourceTarget) > 0.25) {
        try {
          audio.currentTime = Math.max(0, sourceTarget);
        } catch {
          /* ignore seek errors while loading */
        }
      }

      audio.volume = Math.min(1, Math.max(0, state.originalVolume));

      if (state.isTimelinePlaying) {
        if (audio.paused) {
          void audio.play().catch(() => undefined);
        }
      } else if (!audio.paused) {
        audio.pause();
      }
    };

    const unsub = useAppStore.subscribe(sync);
    sync();
    return () => {
      unsub();
      audioRef.current?.pause();
    };
  }, [videoRef, videoUrl]);
}
