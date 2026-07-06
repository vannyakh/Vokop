import { FILMSTRIP_THUMB_WIDTH } from '@vokop/shared';
import { filmstripSlotCount } from '@/features/studio/lib/timelineFilmstrip';

export interface ProjectCover {
  url: string;
  source: 'video' | 'upload';
  timeSec?: number;
}

const COVER_MAX_EDGE = 640;
const COVER_JPEG_QUALITY = 0.82;

export const COVER_UPLOAD_MAX_MB = 10;
export const COVER_UPLOAD_MAX_BYTES = COVER_UPLOAD_MAX_MB * 1024 * 1024;
export const COVER_UPLOAD_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';

export type CoverUploadErrorCode = 'type' | 'size' | 'decode';

export type CoverUploadResult =
  | { ok: true; dataUrl: string; fileName: string; fileSize: number }
  | { ok: false; error: CoverUploadErrorCode };

export function coverUploadErrorMessage(code: CoverUploadErrorCode): string {
  switch (code) {
    case 'type':
      return 'Use JPG, PNG, WebP, or GIF.';
    case 'size':
      return `Image must be under ${COVER_UPLOAD_MAX_MB}MB.`;
    case 'decode':
      return 'Could not read this image.';
  }
}

export function formatCoverFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isCoverImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

export function validateCoverUploadFile(file: File): CoverUploadErrorCode | null {
  if (!isCoverImageFile(file)) return 'type';
  if (file.size > COVER_UPLOAD_MAX_BYTES) return 'size';
  if (file.size <= 0) return 'decode';
  return null;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement): string | null {
  try {
    return canvas.toDataURL('image/jpeg', COVER_JPEG_QUALITY);
  } catch {
    return null;
  }
}

/** Resize any drawable source to a JPEG data URL suitable for project thumbnails. */
export function rasterToCoverDataUrl(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): string | null {
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;
  const scale = Math.min(1, COVER_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  return canvasToJpegDataUrl(canvas);
}

export async function captureVideoCoverDataUrl(
  videoUrl: string,
  timeSec: number,
): Promise<string | null> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = videoUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Video load failed'));
    });
    const safeTime = Math.max(
      0,
      Math.min(timeSec, Math.max(0, (video.duration || timeSec) - 0.05)),
    );
    video.currentTime = safeTime;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    return rasterToCoverDataUrl(video, video.videoWidth || 1280, video.videoHeight || 720);
  } catch {
    return null;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}

export async function fileToCoverDataUrl(file: File): Promise<string | null> {
  const invalid = validateCoverUploadFile(file);
  if (invalid) return null;
  try {
    const img = await loadImageFromFile(file);
    return rasterToCoverDataUrl(img, img.naturalWidth, img.naturalHeight);
  } catch {
    return null;
  }
}

/** Validate, resize, and return a cover-ready JPEG data URL from an uploaded image. */
export async function processCoverUploadFile(file: File): Promise<CoverUploadResult> {
  const invalid = validateCoverUploadFile(file);
  if (invalid) return { ok: false, error: invalid };

  try {
    const img = await loadImageFromFile(file);
    const dataUrl = rasterToCoverDataUrl(img, img.naturalWidth, img.naturalHeight);
    if (!dataUrl) return { ok: false, error: 'decode' };
    return {
      ok: true,
      dataUrl,
      fileName: file.name,
      fileSize: file.size,
    };
  } catch {
    return { ok: false, error: 'decode' };
  }
}

/** Tile a cover image across timeline width (CapCut-style cover strip). */
export function coverPreviewThumbs(url: string, clipPixelWidth: number): string[] {
  const slots = filmstripSlotCount(clipPixelWidth, FILMSTRIP_THUMB_WIDTH);
  return Array.from({ length: slots }, () => url);
}
