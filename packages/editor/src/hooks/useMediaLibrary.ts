/**
 * useMediaLibrary — media import and library management hook.
 * Adapted from Omniclip's OmniMedia component + media_controller patterns.
 *
 * Handles file import, drag-drop, hash deduplication, and element creation.
 */

import { useCallback, useRef, useState } from 'react';
import type { AnyMediaFile, VideoMediaAsset, AudioMediaAsset, ImageMediaAsset, AnyMediaAsset } from '../types/media.js';

/** Compute a quick hash from a File using its name + size + lastModified */
function quickFileHash(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function detectKind(file: File): 'video' | 'audio' | 'image' | null {
  if (ACCEPTED_VIDEO_TYPES.includes(file.type) || file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'video';
  if (ACCEPTED_AUDIO_TYPES.includes(file.type) || file.name.match(/\.(mp3|wav|ogg|aac|flac)$/i)) return 'audio';
  if (ACCEPTED_IMAGE_TYPES.includes(file.type) || file.name.match(/\.(jpe?g|png|gif|webp|avif)$/i)) return 'image';
  return null;
}

/** Probe video metadata (duration, fps, frames) from an HTMLVideoElement */
async function probeVideoMeta(file: File): Promise<{ duration: number; fps: number; frames: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration * 1000; // ms
      const fps = 30; // default; real FPS needs demuxer
      URL.revokeObjectURL(url);
      resolve({ duration, fps, frames: Math.round((video.duration) * fps) });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: 0, fps: 30, frames: 0 });
    };
  });
}

interface UseMediaLibraryOptions {
  onFilesAdded: (assets: AnyMediaAsset[]) => void;
  onFileRemoved: (hash: string) => void;
}

interface UseMediaLibraryResult {
  /** All imported assets */
  assets: AnyMediaAsset[];
  /** Loading placeholders count */
  pendingCount: number;
  /** Import files from an <input type="file"> change event */
  importFromInput: (input: HTMLInputElement) => Promise<void>;
  /** Import files from a drag-drop DataTransfer */
  importFromDrop: (dataTransfer: DataTransfer) => Promise<void>;
  /** Remove an asset by its hash */
  removeAsset: (hash: string) => void;
  /** Drag-over state for drop zone UI */
  dragActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
}

export function useMediaLibrary(options: UseMediaLibraryOptions): UseMediaLibraryResult {
  const { onFilesAdded, onFileRemoved } = options;
  const [assets, setAssets] = useState<AnyMediaAsset[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const hashSet = useRef<Set<string>>(new Set());

  const createVideoAsset = useCallback(async (file: File): Promise<VideoMediaAsset> => {
    const hash = quickFileHash(file);
    const { duration, fps, frames } = await probeVideoMeta(file);
    const url = URL.createObjectURL(file);
    const element = document.createElement('video');
    element.src = url;
    element.preload = 'metadata';
    const thumbnail = url; // can be replaced with canvas thumbnail extraction
    return { kind: 'video', hash, file, frames, fps, duration, proxy: false, element, thumbnail };
  }, []);

  const createAudioAsset = useCallback((file: File): AudioMediaAsset => {
    const hash = quickFileHash(file);
    const element = document.createElement('audio');
    element.src = URL.createObjectURL(file);
    return { kind: 'audio', hash, file, element };
  }, []);

  const createImageAsset = useCallback((file: File): ImageMediaAsset => {
    const hash = quickFileHash(file);
    const url = URL.createObjectURL(file);
    const element = document.createElement('img');
    element.src = url;
    return { kind: 'image', hash, file, element, url };
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    const newFiles = files.filter((f) => {
      const h = quickFileHash(f);
      if (hashSet.current.has(h)) return false;
      hashSet.current.add(h);
      return true;
    });
    if (newFiles.length === 0) return;

    setPendingCount((c) => c + newFiles.length);

    const newAssets: AnyMediaAsset[] = [];
    for (const file of newFiles) {
      const kind = detectKind(file);
      if (!kind) continue;
      try {
        let asset: AnyMediaAsset;
        if (kind === 'video') asset = await createVideoAsset(file);
        else if (kind === 'audio') asset = createAudioAsset(file);
        else asset = createImageAsset(file);
        newAssets.push(asset);
      } finally {
        setPendingCount((c) => Math.max(0, c - 1));
      }
    }

    if (newAssets.length > 0) {
      setAssets((prev) => [...prev, ...newAssets]);
      onFilesAdded(newAssets);
    }
  }, [createVideoAsset, createAudioAsset, createImageAsset, onFilesAdded]);

  const importFromInput = useCallback(async (input: HTMLInputElement) => {
    const files = input.files ? Array.from(input.files) : [];
    await processFiles(files);
  }, [processFiles]);

  const importFromDrop = useCallback(async (dataTransfer: DataTransfer) => {
    const files = Array.from(dataTransfer.files);
    await processFiles(files);
  }, [processFiles]);

  const removeAsset = useCallback((hash: string) => {
    hashSet.current.delete(hash);
    setAssets((prev) => {
      const asset = prev.find((a) => a.hash === hash);
      if (asset && 'url' in asset) URL.revokeObjectURL((asset as ImageMediaAsset).url);
      return prev.filter((a) => a.hash !== hash);
    });
    onFileRemoved(hash);
  }, [onFileRemoved]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as HTMLElement;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      setDragActive(false);
    }
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files) {
      await importFromDrop(e.dataTransfer);
    }
  }, [importFromDrop]);

  return {
    assets,
    pendingCount,
    importFromInput,
    importFromDrop,
    removeAsset,
    dragActive,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
