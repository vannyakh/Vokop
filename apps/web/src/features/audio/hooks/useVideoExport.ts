import { useCallback } from 'react';
import type { RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { decodeBase64ToAudioBuffer, ensureAudioContext } from '@/lib/utils/audio';
import {
  detectBestVideoCodec,
  resolveExportDimensions,
  resolveExportBitrate,
  type ExportSettings,
} from '@/features/studio/lib/exportSettings';
import { parseTranscriptCaptions, renderCaptionsOnCanvas } from '@/features/studio/lib/captionRenderer';

interface ExportRefs {
  videoRef: RefObject<HTMLVideoElement | null>;
  audioContextRef: RefObject<AudioContext | null>;
  videoSourceRef: RefObject<MediaElementAudioSourceNode | null>;
  playMixedAudio: () => Promise<void>;
}

export function useVideoExport(refs: ExportRefs) {
  const setIsExporting = useAppStore((s) => s.setIsExporting);
  const setStatus = useAppStore((s) => s.setStatus);

  const exportVideo = useCallback(
    async (settings: ExportSettings) => {
      const { translatedText, audioBase64, originalVolume, voiceVolume } = useAppStore.getState();
      const video = refs.videoRef.current;
      if (!video || !translatedText) return;

      setIsExporting(true);
      setStatus('idle');

      const { videoWidth: nativeW, videoHeight: nativeH } = video;
      const { width: outW, height: outH } = resolveExportDimensions(nativeW, nativeH, settings.resolution);
      const bitrate = resolveExportBitrate(settings.quality);
      const fps = settings.fps;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;

      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) { setIsExporting(false); return; }

      // Parse timeline-accurate captions
      const captions = parseTranscriptCaptions(translatedText);

      // Detect best codec (GPU-accelerated H.264 preferred)
      const codec = detectBestVideoCodec();
      const stream = canvas.captureStream(fps);

      // Audio routing
      refs.audioContextRef.current = await ensureAudioContext(refs.audioContextRef.current);
      const actx = refs.audioContextRef.current;
      const dest = actx.createMediaStreamDestination();

      if (!refs.videoSourceRef.current) {
        refs.videoSourceRef.current = actx.createMediaElementSource(video);
      }
      const videoSrc = refs.videoSourceRef.current;
      const videoGain = actx.createGain();
      videoGain.gain.value = settings.includeOriginalAudio ? originalVolume : 0;
      videoSrc.disconnect();
      videoSrc.connect(videoGain);
      videoGain.connect(dest);

      if (audioBase64 && settings.includeVoiceover) {
        const audioBuffer = await decodeBase64ToAudioBuffer(actx, audioBase64);
        const voiceSrc = actx.createBufferSource();
        voiceSrc.buffer = audioBuffer;
        const voiceGain = actx.createGain();
        voiceGain.gain.value = voiceVolume;
        voiceSrc.connect(voiceGain);
        voiceGain.connect(dest);
        voiceSrc.start();
      }

      const combined = new MediaStream([
        ...stream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const recorderOptions: MediaRecorderOptions = codec
        ? { mimeType: codec, videoBitsPerSecond: bitrate }
        : { videoBitsPerSecond: bitrate };

      const recorder = new MediaRecorder(combined, recorderOptions);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = () => {
        const isMP4 = codec.includes('mp4') || codec.includes('avc1');
        const mimeType = isMP4 ? 'video/mp4' : 'video/webm';
        const ext = isMP4 ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vokop_export_${settings.resolution}_${settings.quality}.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setIsExporting(false);
      };

      recorder.start(100); // 100ms chunks for smooth streaming
      video.currentTime = 0;
      await video.play();

      if (audioBase64 && settings.includeVoiceover) {
        await refs.playMixedAudio();
      }

      const drawFrame = () => {
        if (video.paused || video.ended) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, outW, outH);

        renderCaptionsOnCanvas(
          ctx,
          captions,
          video.currentTime,
          outW,
          outH,
          settings.captionStyle,
          settings.captionScale,
        );

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
    },
    [refs, setIsExporting, setStatus],
  );

  return { exportVideo };
}
