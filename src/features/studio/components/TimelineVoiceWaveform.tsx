import { useEffect, useState, type RefObject } from 'react';
import { pcmBase64ToObjectUrl } from '@/lib/utils/audio';
import { useWaveSurfer } from '@/features/studio/hooks/useWaveSurfer';

interface TimelineVoiceWaveformProps {
  audioBase64: string;
  width: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  onSeek: (time: number) => void;
}

export function TimelineVoiceWaveform({ audioBase64, width, videoRef, onSeek }: TimelineVoiceWaveformProps) {
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = pcmBase64ToObjectUrl(audioBase64);
    setVoiceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBase64]);

  const { containerRef } = useWaveSurfer({
    url: voiceUrl,
    syncMedia: videoRef,
    height: 40,
    interact: true,
    onSeek,
  });

  if (!voiceUrl) return null;

  return (
    <div className="studio-timeline-voice-wave" style={{ left: 0, width }}>
      <div ref={containerRef} className="studio-timeline-voice-wave-inner" />
    </div>
  );
}
