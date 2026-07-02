import { useEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { generateSpeech } from '@/features/translation/services/gemini';
import { parseTimeToSeconds } from '@/lib/utils/time';
import { decodeBase64ToAudioBuffer, ensureAudioContext } from '@/lib/utils/audio';

export function useReelPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
  audioContextRef: RefObject<AudioContext | null>,
  audioSourceRef: RefObject<AudioBufferSourceNode | null>,
  stopAudio: () => void,
) {
  const currentTime = useAppStore((s) => s.currentTime);
  const isReelMode = useAppStore((s) => s.isReelMode);
  const currentReelStep = useAppStore((s) => s.currentReelStep);
  const videoAnalysis = useAppStore((s) => s.videoAnalysis);
  const reelAudioCache = useAppStore((s) => s.reelAudioCache);
  const selectedVoice = useAppStore((s) => s.selectedVoice);
  const setStatus = useAppStore((s) => s.setStatus);
  const setIsReelMode = useAppStore((s) => s.setIsReelMode);
  const setCurrentReelStep = useAppStore((s) => s.setCurrentReelStep);
  const addReelAudioCache = useAppStore((s) => s.addReelAudioCache);

  const playReelAudio = useCallback(
    async (index: number) => {
      if (!videoAnalysis?.highlights[index]) return;

      try {
        let audioBase64Str = reelAudioCache[index];
        if (!audioBase64Str) {
          setStatus('speaking');
          audioBase64Str = await generateSpeech(
            videoAnalysis.highlights[index].narration,
            selectedVoice,
          );
          addReelAudioCache(index, audioBase64Str);
        }

        audioContextRef.current = await ensureAudioContext(audioContextRef.current);
        const ctx = audioContextRef.current;
        const audioBuffer = decodeBase64ToAudioBuffer(ctx, audioBase64Str);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          audioSourceRef.current = null;
        };

        audioSourceRef.current = source;
        source.start();
        setStatus('idle');
      } catch (error) {
        console.error('Error playing reel audio:', error);
        setStatus('idle');
      }
    },
    [
      videoAnalysis,
      reelAudioCache,
      selectedVoice,
      setStatus,
      addReelAudioCache,
      audioContextRef,
      audioSourceRef,
    ],
  );

  const startReel = useCallback(async () => {
    if (!videoAnalysis?.highlights || !videoRef.current) return;

    stopAudio();
    setIsReelMode(true);
    setCurrentReelStep(0);

    const firstStart = parseTimeToSeconds(videoAnalysis.highlights[0].start);
    videoRef.current.currentTime = firstStart;
    videoRef.current.play();
    await playReelAudio(0);
  }, [videoAnalysis, videoRef, stopAudio, setIsReelMode, setCurrentReelStep, playReelAudio]);

  useEffect(() => {
    if (!isReelMode || !videoAnalysis || !videoRef.current) return;

    const currentHighlight = videoAnalysis.highlights[currentReelStep];
    const endTime = parseTimeToSeconds(currentHighlight.end);

    if (currentTime >= endTime) {
      const nextStep = currentReelStep + 1;
      if (nextStep < videoAnalysis.highlights.length) {
        setCurrentReelStep(nextStep);
        const nextStart = parseTimeToSeconds(videoAnalysis.highlights[nextStep].start);
        videoRef.current.currentTime = nextStart;
        playReelAudio(nextStep);
      } else {
        setIsReelMode(false);
        videoRef.current.pause();
      }
    }
  }, [
    currentTime,
    isReelMode,
    currentReelStep,
    videoAnalysis,
    videoRef,
    setCurrentReelStep,
    setIsReelMode,
    playReelAudio,
  ]);

  return { startReel, playReelAudio };
}
