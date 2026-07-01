import { useCallback } from 'react';
import type { RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { decodeBase64ToAudioBuffer, ensureAudioContext } from '@/lib/utils/audio';

interface ExportRefs {
  videoRef: RefObject<HTMLVideoElement | null>;
  audioContextRef: RefObject<AudioContext | null>;
  videoSourceRef: RefObject<MediaElementAudioSourceNode | null>;
  playMixedAudio: () => Promise<void>;
}

export function useVideoExport(refs: ExportRefs) {
  const setIsExporting = useAppStore((s) => s.setIsExporting);
  const setStatus = useAppStore((s) => s.setStatus);

  const exportVideo = useCallback(async () => {
    const { translatedText, audioBase64, originalVolume, voiceVolume } = useAppStore.getState();
    const video = refs.videoRef.current;
    if (!video || !translatedText) return;

    setIsExporting(true);
    setStatus('idle');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const stream = canvas.captureStream(30);

    refs.audioContextRef.current = await ensureAudioContext(refs.audioContextRef.current);
    const ctxAudio = refs.audioContextRef.current;
    const dest = ctxAudio.createMediaStreamDestination();

    if (!refs.videoSourceRef.current) {
      refs.videoSourceRef.current = ctxAudio.createMediaElementSource(video);
    }
    const videoSource = refs.videoSourceRef.current;
    const videoGain = ctxAudio.createGain();
    videoGain.gain.value = originalVolume;
    videoSource.disconnect();
    videoSource.connect(videoGain);
    videoGain.connect(dest);

    if (audioBase64) {
      const audioBuffer = decodeBase64ToAudioBuffer(ctxAudio, audioBase64);
      const voiceSource = ctxAudio.createBufferSource();
      voiceSource.buffer = audioBuffer;
      const voiceGain = ctxAudio.createGain();
      voiceGain.gain.value = voiceVolume;
      voiceSource.connect(voiceGain);
      voiceGain.connect(dest);
      voiceSource.start();
    }

    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translated_video.webm';
      a.click();
      setIsExporting(false);
    };

    recorder.start();
    video.currentTime = 0;
    await video.play();

    if (audioBase64) {
      await refs.playMixedAudio();
    }

    const drawFrame = () => {
      if (video.paused || video.ended) {
        recorder.stop();
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const fontSize = Math.floor(canvas.height * 0.05);
      ctx.font = `bold ${fontSize}px "Khmer OS Battambang", "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.fillStyle = 'white';

      const lines = translatedText.split('\n').slice(0, 2);
      const margin = canvas.height * 0.1;

      lines.forEach((line, i) => {
        const y = canvas.height - margin - (lines.length - 1 - i) * (fontSize * 1.2);
        ctx.strokeText(line, canvas.width / 2, y);
        ctx.fillText(line, canvas.width / 2, y);
      });

      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  }, [refs, setIsExporting, setStatus]);

  return { exportVideo };
}
