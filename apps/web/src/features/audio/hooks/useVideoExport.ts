import { useCallback } from 'react';
import type { RefObject } from 'react';
import { api } from '@/lib/api';
import { useAppStore } from '@/features/project';
import { decodeBase64ToAudioBuffer } from '@/lib/utils/audio';
import { detectBestVideoCodec, resolveExportBitrate, type ExportSettings } from '@/features/studio/lib/exportSettings';
import { parseTranscriptCaptions, renderCaptionsOnCanvas } from '@/features/studio/lib/captionRenderer';
import type { VideoAudioGraph } from '@/features/audio/hooks/useAudioEngine';

interface ExportRefs {
  videoRef: RefObject<HTMLVideoElement | null>;
  audioContextRef: RefObject<AudioContext | null>;
  videoSourceRef: RefObject<MediaElementAudioSourceNode | null>;
  connectVideoAudioGraph: (video: HTMLVideoElement) => Promise<VideoAudioGraph>;
  playMixedAudio: () => Promise<void>;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useVideoExport(refs: ExportRefs) {
  const setIsExporting = useAppStore((s) => s.setIsExporting);
  const setStatus = useAppStore((s) => s.setStatus);

  const exportVideo = useCallback(
    async (settings: ExportSettings) => {
      const { translatedText, audioBase64, originalVolume, voiceVolume } = useAppStore.getState();
      const video = refs.videoRef.current;
      // Export works on the raw timeline too — a translation/voiceover is optional, not required.
      if (!video) return;

      const rangeIn = Math.max(0, settings.rangeInSec);
      const rangeOut = settings.rangeOutSec > rangeIn ? settings.rangeOutSec : video.duration || rangeIn + 1;
      const isAudioOnly = settings.exportType === 'audio';

      setIsExporting(true);
      setStatus('idle');

      // Capture at native resolution/high bitrate — the server re-encodes to the
      // requested format/codec/quality, so the intermediate recording just needs headroom.
      const outW = video.videoWidth || 1280;
      const outH = video.videoHeight || 720;
      const bitrate = resolveExportBitrate('ultra');
      const fps = settings.fps;

      let canvas: HTMLCanvasElement | null = null;
      let ctx: CanvasRenderingContext2D | null = null;
      let captions: ReturnType<typeof parseTranscriptCaptions> = [];

      if (!isAudioOnly) {
        canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) {
          setIsExporting(false);
          return;
        }
        captions = parseTranscriptCaptions(translatedText);
      }

      const videoCodec = detectBestVideoCodec();

      // Audio routing (mixed original + voiceover) — reuse the video's persistent
      // graph and just fan the shared gain out to the recorder's destination too,
      // instead of disconnecting it (that would silence every other consumer).
      const { ctx: actx, gain: videoGain } = await refs.connectVideoAudioGraph(video);
      const dest = actx.createMediaStreamDestination();
      videoGain.gain.value = settings.includeOriginalAudio ? originalVolume : 0;
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

      const recordedStream = isAudioOnly
        ? new MediaStream([...dest.stream.getAudioTracks()])
        : new MediaStream([...canvas!.captureStream(fps).getVideoTracks(), ...dest.stream.getAudioTracks()]);

      const mimeType = isAudioOnly
        ? (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm')
        : videoCodec;

      const recorderOptions: MediaRecorderOptions = mimeType
        ? { mimeType, videoBitsPerSecond: isAudioOnly ? undefined : bitrate }
        : {};

      const recorder = new MediaRecorder(recordedStream, recorderOptions);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const finishExport = async () => {
        try {
          const recordedBlob = new Blob(chunks, { type: mimeType || (isAudioOnly ? 'audio/webm' : 'video/webm') });

          const { jobId } = await api.startExportRender(recordedBlob, {
            exportType: settings.exportType,
            format: settings.format,
            codec: settings.exportType === 'video' ? settings.codec : undefined,
            quality: settings.quality,
            removeWatermark: settings.removeWatermark,
            rangeInSec: 0,
            rangeOutSec: Math.max(0.1, rangeOut - rangeIn),
          });

          const job = await api.waitForExportJob(jobId);
          const fileBlob = await api.downloadExportJob(jobId);
          triggerBrowserDownload(fileBlob, `vokop_export.${job.outputFormat ?? settings.format}`);
        } catch (err) {
          console.error('[export] failed', err);
          setStatus('error');
        } finally {
          setIsExporting(false);
        }
      };

      recorder.onstop = () => {
        // Targeted disconnect — only drops the recorder tap, leaving the shared
        // gain's permanent connection to speakers intact for other consumers.
        videoGain.disconnect(dest);
        videoGain.gain.value = 1.0;
        void finishExport();
      };

      recorder.start(100); // 100ms chunks for smooth streaming
      video.currentTime = rangeIn;
      await video.play();

      if (audioBase64 && settings.includeVoiceover) {
        await refs.playMixedAudio();
      }

      const tick = () => {
        if (video.paused || video.ended || video.currentTime >= rangeOut) {
          recorder.stop();
          return;
        }

        if (!isAudioOnly && ctx && canvas) {
          ctx.drawImage(video, 0, 0, outW, outH);
          renderCaptionsOnCanvas(ctx, captions, video.currentTime, outW, outH, settings.captionStyle, settings.captionScale);
        }

        requestAnimationFrame(tick);
      };

      tick();
    },
    [refs, setIsExporting, setStatus],
  );

  return { exportVideo };
}
