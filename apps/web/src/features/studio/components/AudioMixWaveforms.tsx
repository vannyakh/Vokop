import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { pcmBase64ToObjectUrl } from '@/lib/utils/audio';
import { useWaveSurfer } from '@/features/studio/hooks/useWaveSurfer';

interface AudioMixWaveformsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function AudioMixWaveforms({ videoRef }: AudioMixWaveformsProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!audioBase64) {
      setVoiceUrl(null);
      return;
    }
    const url = pcmBase64ToObjectUrl(audioBase64);
    setVoiceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBase64]);

  const seekTimeline = useAppStore((s) => s.seekTimeline);
  const seekVideo = useCallback(
    (time: number) => {
      seekTimeline(time);
    },
    [seekTimeline],
  );

  const originalWave = useWaveSurfer({
    media: videoRef,
    mediaReadyKey: videoUrl,
    height: 52,
    waveColor: 'rgba(140, 140, 140, 0.35)',
    progressColor: 'rgba(200, 200, 200, 0.75)',
    onSeek: seekVideo,
  });

  const voiceWave = useWaveSurfer({
    url: voiceUrl,
    syncMedia: videoRef,
    mediaReadyKey: videoUrl,
    height: 52,
    onSeek: seekVideo,
  });

  const showOriginal = Boolean(videoUrl);

  const tracks = useMemo(
    () =>
      [
        showOriginal && { id: 'original', label: 'Original', ref: originalWave.containerRef },
        voiceUrl && { id: 'voice', label: 'AI Voice', ref: voiceWave.containerRef },
      ].filter(Boolean) as { id: string; label: string; ref: typeof originalWave.containerRef }[],
    [showOriginal, voiceUrl, originalWave.containerRef, voiceWave.containerRef],
  );

  if (tracks.length === 0) return null;

  return (
    <div className="studio-audio-waveforms">
      {tracks.map((track) => (
        <div key={track.id} className="studio-audio-waveform-row">
          <span className="studio-audio-waveform-label">{track.label}</span>
          <div className="studio-audio-waveform-canvas" ref={track.ref} />
        </div>
      ))}
    </div>
  );
}
