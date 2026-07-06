import { useAppStore } from '@/features/project';
import {
  findVideoClipForPreview,
  listVideoTrackIds,
  timelineToVideoSourceTime,
} from '@/features/studio/lib/mediaClips';
import type { TimelineTrackId } from '@/features/studio/lib/timelineTypes';
import { studioEdit } from '@/features/studio/services/studioEdit';

function resolveFootageClip(clipId?: string) {
  const state = useAppStore.getState();
  const videoTrackIds = listVideoTrackIds(
    state.extraTimelineTracks,
    state.timelineTrackOrder,
    state.timelineTrackHidden,
  );
  if (clipId) {
    return state.videoClips.find((c) => c.id === clipId) ?? null;
  }
  const selected = state.selectedTimelineClip;
  if (
    selected &&
    (selected.trackId === 'video' || String(selected.trackId).startsWith('video-'))
  ) {
    return state.videoClips.find((c) => c.id === selected.clipId) ?? null;
  }
  return findVideoClipForPreview(
    state.videoClips,
    state.currentTime,
    videoTrackIds,
    state.timelineTrackPreviewHidden,
  );
}

function resolveClipSourceUrl(clipId: string): string | null {
  const state = useAppStore.getState();
  const clip = state.videoClips.find((c) => c.id === clipId);
  if (!clip) return null;
  if (clip.mediaAssetId) {
    const asset = state.mediaAssets.find((a) => a.id === clip.mediaAssetId);
    if (asset?.url) return asset.url;
  }
  return state.videoUrl;
}

function triggerDownload(url: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function captureVideoFrameBlob(url: string, sourceTime: number): Promise<Blob | null> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Video load failed'));
    });
    video.currentTime = Math.max(0, Math.min(sourceTime, Math.max(0, video.duration - 0.05)));
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  } catch {
    return null;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}

export function openFootageMediaReplace(clipId?: string): void {
  const state = useAppStore.getState();
  const clip = resolveFootageClip(clipId);
  if (clip) {
    const trackId = (clip.trackId ?? 'video') as TimelineTrackId;
    state.selectTimelineClip({ trackId, clipId: clip.id }, { syncCanvas: true, openInspector: false });
  }
  state.setActiveStudioTool('media');
  state.setToolsDrawerOpen(true);
}

export function openTranscriptEditor(): void {
  const state = useAppStore.getState();
  state.setActiveTab('transcript');
  state.setEditorOpen(true);
}

export function downloadFootageClip(clipId?: string): void {
  const clip = resolveFootageClip(clipId);
  if (!clip) return;
  const url = resolveClipSourceUrl(clip.id);
  if (!url) return;
  const name = clip.name?.trim() || 'footage';
  const ext = name.includes('.') ? '' : '.mp4';
  triggerDownload(url, `${name}${ext}`);
}

export function downloadFootageFrame(clipId?: string): void {
  void (async () => {
    const state = useAppStore.getState();
    const clip = resolveFootageClip(clipId);
    if (!clip) return;
    const url = resolveClipSourceUrl(clip.id);
    if (!url) return;

    const videoTrackIds = listVideoTrackIds(
      state.extraTimelineTracks,
      state.timelineTrackOrder,
      state.timelineTrackHidden,
    );
    const mapped = timelineToVideoSourceTime(
      state.videoClips,
      state.currentTime,
      videoTrackIds,
      state.timelineTrackPreviewHidden,
    );
    const sourceTime =
      mapped?.sourceTime ??
      clip.sourceStart + Math.max(0, Math.min(state.currentTime - clip.start, clip.duration));

    const blob = await captureVideoFrameBlob(url, sourceTime);
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, `${clip.name || 'frame'}-freeze.png`);
    URL.revokeObjectURL(objectUrl);
  })();
}

export function separateFootageAudio(clipId?: string): void {
  studioEdit.detachAudioFromVideo(clipId);
}

export function splitFootageScene(): void {
  studioEdit.splitAtPlayhead();
}

export async function freezeFootageAtPlayhead(clipId?: string): Promise<void> {
  const state = useAppStore.getState();
  const clip = resolveFootageClip(clipId);
  const url = clip ? resolveClipSourceUrl(clip.id) : state.videoUrl;
  if (!url || !clip) return;

  const videoTrackIds = listVideoTrackIds(
    state.extraTimelineTracks,
    state.timelineTrackOrder,
    state.timelineTrackHidden,
  );
  const mapped = timelineToVideoSourceTime(
    state.videoClips,
    state.currentTime,
    videoTrackIds,
    state.timelineTrackPreviewHidden,
  );
  const sourceTime =
    mapped?.sourceTime ??
    clip.sourceStart + Math.max(0, Math.min(state.currentTime - clip.start, clip.duration));

  const blob = await captureVideoFrameBlob(url, sourceTime);
  if (!blob) return;

  const objectUrl = URL.createObjectURL(blob);
  const t = state.currentTime;
  const freezeDuration = 3;
  state.addCanvasImageFromUrl(objectUrl, {
    label: 'Freeze frame',
    startTime: t,
    endTime: Math.min(state.duration || t + freezeDuration, t + freezeDuration),
    width: state.videoWidth || 1280,
    height: state.videoHeight || 720,
    keepStudioTool: true,
    trackId: 'image',
  });
}
