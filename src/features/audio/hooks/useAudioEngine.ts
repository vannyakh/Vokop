import { useRef, useCallback } from 'react';
import { useAppStore } from '@/features/project';
import { decodeBase64ToAudioBuffer, ensureAudioContext } from '@/lib/utils/audio';

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const voiceVolume = useAppStore((s) => s.voiceVolume);
  const setIsAudioPlaying = useAppStore((s) => s.setIsAudioPlaying);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsAudioPlaying(false);
  }, [setIsAudioPlaying]);

  const playSegment = useCallback(
    async (base64: string, onPlayingChange: (playing: boolean) => void) => {
      try {
        audioContextRef.current = await ensureAudioContext(audioContextRef.current);
        const ctx = audioContextRef.current;

        const audioBuffer = decodeBase64ToAudioBuffer(ctx, base64);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = voiceVolume;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.onended = () => {
          onPlayingChange(false);
          audioSourceRef.current = null;
        };

        audioSourceRef.current = source;
        onPlayingChange(true);
        source.start();
      } catch (error) {
        console.error('Error playing audio:', error);
        onPlayingChange(false);
      }
    },
    [voiceVolume],
  );

  return {
    audioContextRef,
    audioSourceRef,
    videoSourceRef,
    stopAudio,
    playSegment,
  };
}
