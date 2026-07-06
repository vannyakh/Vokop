import { useEffect, useRef, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { effectiveClipVolume } from '@/features/studio/lib/audioClipMix';
import { findClipAtTime, findVideoClipForPreview, listVideoTrackIds } from '@/features/studio/lib/mediaClips';
import { resolveClipAudioSource } from '@/features/studio/lib/resolveClipAudioSource';

/**
 * Timeline audio playback: linked/detached video audio, imported files, and AI voice clips.
 * Also applies per-clip volume/fades to embedded video audio.
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

      const embedGlobal = state.originalVolume;
      const embedVol = vClip
        ? effectiveClipVolume(
            { ...vClip, volume: (vClip.volume ?? 1) * embedGlobal },
            state.currentTime,
            videoTrackMuted,
          )
        : 0;
      video.muted = videoTrackMuted || Boolean(vClip?.muted) || embedVol <= 0;
      video.volume = Math.min(1, embedVol);

      if (!audio) return;

      const aClip = findClipAtTime(state.audioClips, state.currentTime);
      const audioTrackId = aClip?.trackId ?? 'audio';
      const audioTrackMuted = state.timelineTrackMuted[audioTrackId] ?? false;

      if (!aClip || audioTrackMuted) {
        if (!audio.paused) audio.pause();
        return;
      }

      const source = resolveClipAudioSource(
        {
          id: aClip.id,
          start: aClip.start,
          duration: aClip.duration,
          sourceStart: aClip.sourceStart,
          name: aClip.name,
          mediaKind: 'audio',
        },
        {
          videoUrl: state.videoUrl,
          audioBase64: state.audioBase64,
          mediaAssets: state.mediaAssets,
          audioClips: state.audioClips,
          videoClips: state.videoClips,
          mediaDuration: state.mediaDuration,
          duration: state.duration,
        },
      );

      if (!source?.url) {
        if (!audio.paused) audio.pause();
        return;
      }

      if (audio.src !== source.url) {
        audio.src = source.url;
        audio.load();
      }

      const sourceTarget = aClip.sourceStart + (state.currentTime - aClip.start);
      if (Math.abs(audio.currentTime - sourceTarget) > 0.25) {
        try {
          audio.currentTime = Math.max(0, sourceTarget);
        } catch {
          /* ignore seek errors while loading */
        }
      }

      const globalBase = aClip.linkedVideoClipId ? state.originalVolume : state.voiceVolume;
      const clipVol = effectiveClipVolume(
        { ...aClip, volume: (aClip.volume ?? 1) * globalBase },
        state.currentTime,
        false,
      );
      audio.volume = Math.min(1, clipVol);
      audio.muted = clipVol <= 0 || Boolean(aClip.muted);

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

  return { timelineAudioRef: audioRef };
}
