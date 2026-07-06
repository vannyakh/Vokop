import { useRef, useCallback } from 'react';
import { useAppStore } from '@/features/project';
import { decodeBase64ToAudioBuffer, ensureAudioContext } from '@/lib/utils/audio';

export interface VideoAudioGraph {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  /** Persistent volume control for the video's embedded audio — always connected to speakers. */
  gain: GainNode;
  /** Tapped off `gain` (post-volume) for live level metering; never touches audible output. */
  analyser: AnalyserNode;
}

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoGainRef = useRef<GainNode | null>(null);
  const videoAnalyserRef = useRef<AnalyserNode | null>(null);
  const timelineAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const timelineAudioGainRef = useRef<GainNode | null>(null);
  const timelineAudioAnalyserRef = useRef<AnalyserNode | null>(null);

  const voiceVolume = useAppStore((s) => s.voiceVolume);
  const setIsAudioPlaying = useAppStore((s) => s.setIsAudioPlaying);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsAudioPlaying(false);
  }, [setIsAudioPlaying]);

  /**
   * Wraps the main `<video>` element in a Web Audio graph exactly once, wiring
   * `source -> gain -> destination` permanently so its audio is always audible.
   * Callers (sync playback, export, the level meter) share this single graph —
   * they must only tweak `gain.gain.value` or fan out additional taps, never
   * call `source.disconnect()`, or every other consumer goes silent with it.
   */
  const connectVideoAudioGraph = useCallback(
    async (video: HTMLVideoElement): Promise<VideoAudioGraph> => {
      audioContextRef.current = await ensureAudioContext(audioContextRef.current);
      const ctx = audioContextRef.current;

      if (!videoSourceRef.current) {
        videoSourceRef.current = ctx.createMediaElementSource(video);
      }
      const source = videoSourceRef.current;

      if (!videoGainRef.current) {
        const gain = ctx.createGain();
        gain.gain.value = 1;
        source.connect(gain);
        gain.connect(ctx.destination);
        videoGainRef.current = gain;
      }
      const gain = videoGainRef.current;

      if (!videoAnalyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.55;
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0;
        gain.connect(analyser);
        analyser.connect(silentGain);
        silentGain.connect(ctx.destination);
        videoAnalyserRef.current = analyser;
      }

      return { ctx, source, gain, analyser: videoAnalyserRef.current };
    },
    [],
  );

  /** Hidden timeline audio element (voice / sound clips) for level metering. */
  const connectTimelineAudioGraph = useCallback(
    async (media: HTMLMediaElement): Promise<AnalyserNode | null> => {
      audioContextRef.current = await ensureAudioContext(audioContextRef.current);
      const ctx = audioContextRef.current;

      if (!timelineAudioSourceRef.current) {
        timelineAudioSourceRef.current = ctx.createMediaElementSource(media);
        const gain = ctx.createGain();
        gain.gain.value = 1;
        timelineAudioSourceRef.current.connect(gain);
        gain.connect(ctx.destination);
        timelineAudioGainRef.current = gain;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.35;
        gain.connect(analyser);
        timelineAudioAnalyserRef.current = analyser;
      }

      return timelineAudioAnalyserRef.current;
    },
    [],
  );

  const playSegment = useCallback(
    async (base64: string, onPlayingChange: (playing: boolean) => void) => {
      try {
        audioContextRef.current = await ensureAudioContext(audioContextRef.current);
        const ctx = audioContextRef.current;

        const audioBuffer = await decodeBase64ToAudioBuffer(ctx, base64);
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
    connectVideoAudioGraph,
    connectTimelineAudioGraph,
    stopAudio,
    playSegment,
  };
}
