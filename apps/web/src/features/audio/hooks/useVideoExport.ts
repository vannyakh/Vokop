import { useCallback } from 'react';
import type { RefObject } from 'react';
import { api } from '@/lib/api';
import { useAppStore } from '@/features/project';
import { detectBestVideoCodec, resolveExportBitrate, type ExportSettings } from '@/features/studio/lib/exportSettings';
import { collectBackgroundImageUrls } from '@/features/studio/lib/compositionBackground';
import {
  buildCompositorSnapshot,
  createExportCompositorResources,
  disposeExportCompositorResources,
  parseExportCaptions,
  preloadCanvasImages,
  resolveCompositorExportSize,
  runCompositorExportLoop,
} from '@/features/studio/lib/compositorExport';
import { runWasmCompositorExportLoop } from '@/features/studio/lib/compositorWasm';
import {
  buildExportAudioSnapshot,
  evenExportDimensions,
  ExportVideoEncoder,
  isWebCodecsExportSupported,
  mapExportCodecToWebCodecs,
  muxExportClip,
  recordExportAudioPass,
  voiceBlobFromBase64,
} from '@/features/studio/lib/export';
import type { ExportComposedRenderMeta } from '@vokop/api';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
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

async function uploadComposedExport(
  videoBinary: Uint8Array,
  settings: ExportSettings,
  rangeIn: number,
  rangeOut: number,
  meta: ExportComposedRenderMeta,
  voiceBlob: Blob | null,
) {
  const blob = new Blob([videoBinary], { type: 'application/octet-stream' });
  const { jobId } = await api.startComposedExportRender(blob, meta, voiceBlob);
  const job = await api.waitForExportJob(jobId);
  const fileBlob = await api.downloadExportJob(jobId);
  triggerBrowserDownload(fileBlob, `vokop_export.${job.outputFormat ?? settings.format}`);
}

async function uploadExportBlob(recordedBlob: Blob, settings: ExportSettings, rangeIn: number, rangeOut: number) {
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
}

export function useVideoExport(refs: ExportRefs) {
  const setIsExporting = useAppStore((s) => s.setIsExporting);
  const setExportProgress = useAppStore((s) => s.setExportProgress);
  const setStatus = useAppStore((s) => s.setStatus);

  const exportVideo = useCallback(
    async (settings: ExportSettings) => {
      const state = useAppStore.getState();
      const { translatedText, audioBase64, originalVolume, voiceVolume } = state;
      const video = refs.videoRef.current;
      if (!video) return;

      const rangeIn = Math.max(0, settings.rangeInSec);
      const rangeOut =
        settings.rangeOutSec > rangeIn ? settings.rangeOutSec : video.duration || state.duration || rangeIn + 1;
      const isAudioOnly = settings.exportType === 'audio';
      const exportDuration = Math.max(0.001, rangeOut - rangeIn);

      setIsExporting(true);
      setExportProgress(0);
      setStatus('idle');

      const snapshot = buildCompositorSnapshot(state);
      const rawExportSize = isAudioOnly
        ? { width: snapshot.videoWidth || 1280, height: snapshot.videoHeight || 720 }
        : resolveCompositorExportSize(snapshot, settings.resolution);
      const exportSize = evenExportDimensions(rawExportSize.width, rawExportSize.height);
      const bitrate = resolveExportBitrate(settings.quality);
      const fps = settings.fps;
      const webCodecsCodec = mapExportCodecToWebCodecs(settings.codec, settings.format);
      const useWebCodecs =
        !isAudioOnly &&
        settings.format === 'mp4' &&
        (await isWebCodecsExportSupported(exportSize.width, exportSize.height, fps, webCodecsCodec));

      let serverMux = false;
      if (useWebCodecs) {
        try {
          const health = await api.videoToolsHealth();
          const ffmpegOk = health.ffmpeg?.ok ?? false;
          const canMuxOriginal =
            !settings.includeOriginalAudio || Boolean(state.videoSessionId);
          serverMux = ffmpegOk && canMuxOriginal;
        } catch {
          serverMux = false;
        }
      }

      let exportActive = true;

      try {
        if (isAudioOnly) {
          await exportAudioOnly({
            video,
            refs,
            settings,
            rangeIn,
            rangeOut,
            audioBase64,
            originalVolume,
            voiceVolume,
            exportActive: () => exportActive,
            setExportProgress,
          });
          return;
        }

        if (useWebCodecs) {
          await exportWithWebCodecs({
            video,
            refs,
            settings,
            snapshot,
            exportSize,
            rangeIn,
            rangeOut,
            exportDuration,
            bitrate,
            fps,
            webCodecsCodec,
            translatedText,
            audioBase64,
            originalVolume,
            voiceVolume,
            videoSessionId: state.videoSessionId,
            videoClips: state.videoClips,
            audioClips: state.audioClips,
            serverMux,
            exportActive: () => exportActive,
            setExportProgress,
          });
          return;
        }

        await exportWithMediaRecorder({
          video,
          refs,
          settings,
          snapshot,
          exportSize,
          rangeIn,
          rangeOut,
          translatedText,
          audioBase64,
          originalVolume,
          voiceVolume,
          bitrate,
          fps,
          exportActive: () => exportActive,
          setExportProgress,
        });
      } catch (err) {
        console.error('[export] failed', err);
        setStatus('error');
      } finally {
        exportActive = false;
        setIsExporting(false);
      }
    },
    [refs, setExportProgress, setIsExporting, setStatus],
  );

  return { exportVideo };
}

async function exportAudioOnly(input: {
  video: HTMLVideoElement;
  refs: ExportRefs;
  settings: ExportSettings;
  rangeIn: number;
  rangeOut: number;
  audioBase64: string | null;
  originalVolume: number;
  voiceVolume: number;
  exportActive: () => boolean;
  setExportProgress: (n: number) => void;
}) {
  const audioBlob = await recordExportAudioPass({
    sourceVideo: input.video,
    connectVideoAudioGraph: input.refs.connectVideoAudioGraph,
    rangeIn: input.rangeIn,
    durationSec: input.rangeOut - input.rangeIn,
    includeOriginalAudio: input.settings.includeOriginalAudio,
    includeVoiceover: input.settings.includeVoiceover,
    audioBase64: input.audioBase64,
    originalVolume: input.originalVolume,
    voiceVolume: input.voiceVolume,
    onProgress: (pct) => input.setExportProgress(Math.min(99, pct)),
  });

  if (!audioBlob) throw new Error('No audio captured');
  input.setExportProgress(100);
  await uploadExportBlob(audioBlob, input.settings, input.rangeIn, input.rangeOut);
}

async function exportWithWebCodecs(input: {
  video: HTMLVideoElement;
  refs: ExportRefs;
  settings: ExportSettings;
  snapshot: ReturnType<typeof buildCompositorSnapshot>;
  exportSize: { width: number; height: number };
  rangeIn: number;
  rangeOut: number;
  exportDuration: number;
  bitrate: number;
  fps: number;
  webCodecsCodec: 'h264' | 'vp9';
  translatedText: string;
  audioBase64: string | null;
  originalVolume: number;
  voiceVolume: number;
  videoSessionId: string | null;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  serverMux: boolean;
  exportActive: () => boolean;
  setExportProgress: (n: number) => void;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = input.exportSize.width;
  canvas.height = input.exportSize.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');

  const captions = parseExportCaptions(input.translatedText);
  const images = await preloadCanvasImages(
    input.snapshot.canvasElements,
    collectBackgroundImageUrls(
      input.snapshot.compositionBackground,
      input.snapshot.videoClips,
      input.snapshot.mediaAssets,
    ),
  );
  const exportResources = await createExportCompositorResources(input.snapshot);
  const encoder = new ExportVideoEncoder();

  try {
    await encoder.configure({
      width: input.exportSize.width,
      height: input.exportSize.height,
      bitrate: input.bitrate,
      fps: input.fps,
      codec: input.webCodecsCodec,
    });

    const wasmLoopOptions = {
      video: input.video,
      ctx,
      snapshot: input.snapshot,
      settings: input.settings,
      captions,
      exportSize: input.exportSize,
      images,
      rangeIn: input.rangeIn,
      rangeOut: input.rangeOut,
      syncOriginalAudio: input.settings.includeOriginalAudio,
      forceSeekLoop: true,
      exportResources,
      onFrame: async () => {
        await encoder.encodeCanvas(canvas);
      },
      onProgress: (pct: number) => input.setExportProgress(Math.min(80, pct * 0.8)),
      shouldStop: () => !input.exportActive(),
    };

    const usedWasmExport = await runWasmCompositorExportLoop(wasmLoopOptions);

    if (!usedWasmExport) {
      await runCompositorExportLoop(wasmLoopOptions);
    }

    input.setExportProgress(82);
    const videoBinary = await encoder.flush();

    if (input.serverMux) {
      input.setExportProgress(88);
      const meta: ExportComposedRenderMeta = {
        settings: {
          ...input.settings,
          rangeInSec: input.rangeIn,
          rangeOutSec: input.rangeOut,
        },
        fps: input.fps,
        audioSnapshot: buildExportAudioSnapshot({
          sessionId: input.videoSessionId,
          videoClips: input.videoClips,
          audioClips: input.audioClips,
          includeOriginalAudio: input.settings.includeOriginalAudio,
          includeVoiceover: input.settings.includeVoiceover,
          originalVolume: input.originalVolume,
          voiceVolume: input.voiceVolume,
        }),
      };
      const voiceBlob =
        input.settings.includeVoiceover ? voiceBlobFromBase64(input.audioBase64) : null;
      input.setExportProgress(92);
      await uploadComposedExport(
        videoBinary,
        input.settings,
        input.rangeIn,
        input.rangeOut,
        meta,
        voiceBlob,
      );
      input.setExportProgress(100);
      return;
    }

    input.setExportProgress(84);
    const audioBlob = await recordExportAudioPass({
      sourceVideo: input.video,
      connectVideoAudioGraph: input.refs.connectVideoAudioGraph,
      rangeIn: input.rangeIn,
      durationSec: input.exportDuration,
      includeOriginalAudio: input.settings.includeOriginalAudio,
      includeVoiceover: input.settings.includeVoiceover,
      audioBase64: input.audioBase64,
      originalVolume: input.originalVolume,
      voiceVolume: input.voiceVolume,
      onProgress: (pct) => input.setExportProgress(84 + pct * 0.1),
    });

    input.setExportProgress(95);
    const muxed = await muxExportClip({
      videoBinary,
      audioBlob,
      fps: input.fps,
      format: input.settings.format as 'mp4' | 'webm',
      codec: input.webCodecsCodec,
    });

    input.setExportProgress(98);
    await uploadExportBlob(muxed, input.settings, input.rangeIn, input.rangeOut);
    input.setExportProgress(100);
  } finally {
    encoder.dispose();
    disposeExportCompositorResources(exportResources);
    input.video.pause();
  }
}

async function exportWithMediaRecorder(input: {
  video: HTMLVideoElement;
  refs: ExportRefs;
  settings: ExportSettings;
  snapshot: ReturnType<typeof buildCompositorSnapshot>;
  exportSize: { width: number; height: number };
  rangeIn: number;
  rangeOut: number;
  translatedText: string;
  audioBase64: string | null;
  originalVolume: number;
  voiceVolume: number;
  bitrate: number;
  fps: number;
  exportActive: () => boolean;
  setExportProgress: (n: number) => void;
}) {
  const { decodeBase64ToAudioBuffer } = await import('@/lib/utils/audio');

  const canvas = document.createElement('canvas');
  canvas.width = input.exportSize.width;
  canvas.height = input.exportSize.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');

  const captions = parseExportCaptions(input.translatedText);
  const images = await preloadCanvasImages(
    input.snapshot.canvasElements,
    collectBackgroundImageUrls(
      input.snapshot.compositionBackground,
      input.snapshot.videoClips,
      input.snapshot.mediaAssets,
    ),
  );
  const exportResources = await createExportCompositorResources(input.snapshot);
  const videoCodec = detectBestVideoCodec();

  try {
    const { ctx: actx, gain: videoGain } = await input.refs.connectVideoAudioGraph(input.video);
    const dest = actx.createMediaStreamDestination();
    videoGain.gain.value = input.settings.includeOriginalAudio ? input.originalVolume : 0;
    videoGain.connect(dest);

    if (input.audioBase64 && input.settings.includeVoiceover) {
      const audioBuffer = await decodeBase64ToAudioBuffer(actx, input.audioBase64);
      const voiceSrc = actx.createBufferSource();
      voiceSrc.buffer = audioBuffer;
      const voiceGain = actx.createGain();
      voiceGain.gain.value = input.voiceVolume;
      voiceSrc.connect(voiceGain);
      voiceGain.connect(dest);
      voiceSrc.start();
    }

    const mimeType = videoCodec || 'video/webm';
    const recordedStream = new MediaStream([
      ...canvas.captureStream(input.fps).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const recorder = new MediaRecorder(recordedStream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      videoBitsPerSecond: input.bitrate,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    await new Promise<void>((resolve, reject) => {
      recorder.onstop = () => {
        videoGain.disconnect(dest);
        videoGain.gain.value = 1.0;
        input.video.pause();
        resolve();
      };
      recorder.onerror = () => reject(new Error('MediaRecorder failed'));

      recorder.start(100);

      const syncOriginalAudio = input.settings.includeOriginalAudio;
      if (syncOriginalAudio) {
        input.video.currentTime = input.rangeIn;
        if (input.audioBase64 && input.settings.includeVoiceover) {
          void input.refs.playMixedAudio();
        }
      }

      void runCompositorExportLoop({
        video: input.video,
        ctx,
        snapshot: input.snapshot,
        settings: input.settings,
        captions,
        exportSize: input.exportSize,
        images,
        rangeIn: input.rangeIn,
        rangeOut: input.rangeOut,
        syncOriginalAudio,
        exportResources,
        onProgress: (pct) => input.setExportProgress(Math.min(99, pct)),
        shouldStop: () => !input.exportActive(),
      })
        .then(() => recorder.stop())
        .catch(reject);
    });

    const recordedBlob = new Blob(chunks, { type: mimeType });
    input.setExportProgress(100);
    await uploadExportBlob(recordedBlob, input.settings, input.rangeIn, input.rangeOut);
  } finally {
    disposeExportCompositorResources(exportResources);
  }
}
