import { useCallback } from 'react';
import type { RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { decodeBase64ToAudioBuffer, ensureAudioContext } from '@/lib/utils/audio';

interface SyncPlaybackRefs {
  videoRef: RefObject<HTMLVideoElement | null>;
  audioContextRef: RefObject<AudioContext | null>;
  audioSourceRef: RefObject<AudioBufferSourceNode | null>;
  videoSourceRef: RefObject<MediaElementAudioSourceNode | null>;
  stopAudio: () => void;
  playSegment: (base64: string, onPlayingChange: (playing: boolean) => void) => Promise<void>;
}

export function useSyncPlayback(refs: SyncPlaybackRefs) {
  const setIsSyncPlaying = useAppStore((s) => s.setIsSyncPlaying);
  const setIsPlayingAnalysis = useAppStore((s) => s.setIsPlayingAnalysis);
  const setIsAudioPlaying = useAppStore((s) => s.setIsAudioPlaying);

  const playMixedAudio = useCallback(async () => {
    const { audioBase64, originalVolume, voiceVolume } = useAppStore.getState();
    const video = refs.videoRef.current;
    if (!audioBase64 || !video) return;

    try {
      refs.audioContextRef.current = await ensureAudioContext(refs.audioContextRef.current);
      const ctx = refs.audioContextRef.current;

      const audioBuffer = decodeBase64ToAudioBuffer(ctx, audioBase64);
      const voiceSource = ctx.createBufferSource();
      voiceSource.buffer = audioBuffer;

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = voiceVolume;
      voiceSource.connect(voiceGain);
      voiceGain.connect(ctx.destination);

      video.currentTime = 0;

      if (!refs.videoSourceRef.current) {
        refs.videoSourceRef.current = ctx.createMediaElementSource(video);
      }
      const videoSource = refs.videoSourceRef.current;
      const videoGain = ctx.createGain();
      videoGain.gain.value = originalVolume;

      videoSource.disconnect();
      videoSource.connect(videoGain);
      videoGain.connect(ctx.destination);

      voiceSource.onended = () => {
        setIsAudioPlaying(false);
        refs.audioSourceRef.current = null;
        if (refs.videoRef.current) {
          refs.videoRef.current.pause();
          videoGain.gain.value = 1.0;
        }
      };

      refs.audioSourceRef.current = voiceSource;
      setIsAudioPlaying(true);
      video.play();
      voiceSource.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsAudioPlaying(false);
    }
  }, [refs, setIsAudioPlaying]);

  const toggleSyncPlayback = useCallback(() => {
    const { audioBase64, originalVolume, isSyncPlaying } = useAppStore.getState();
    const video = refs.videoRef.current;
    if (!video || !audioBase64) return;

    if (isSyncPlaying) {
      video.pause();
      refs.stopAudio();
      setIsSyncPlaying(false);
    } else {
      video.currentTime = 0;
      video.volume = originalVolume;
      video.play();
      refs.playSegment(audioBase64, (playing) => setIsSyncPlaying(playing));
      setIsSyncPlaying(true);
    }
  }, [refs, setIsSyncPlaying]);

  const handlePlayAnalysis = useCallback(async () => {
    const { analysisAudio, isPlayingAnalysis } = useAppStore.getState();
    if (!analysisAudio) return;

    if (isPlayingAnalysis) {
      refs.stopAudio();
      setIsPlayingAnalysis(false);
      return;
    }

    await refs.playSegment(analysisAudio, setIsPlayingAnalysis);
  }, [refs, setIsPlayingAnalysis]);

  return { playMixedAudio, toggleSyncPlayback, handlePlayAnalysis };
}
