/**
 * Media file types — inspired by Omniclip's omni-media component types.
 * Hash-keyed, kind-discriminated media assets stored in the media library.
 */

export type MediaKind = 'video' | 'audio' | 'image';

export interface MediaFileBase {
  /** Unique content-hash identifier (SHA-1 or similar) */
  hash: string;
  /** Original file handle */
  file: File;
}

export interface VideoMediaFile extends MediaFileBase {
  kind: 'video';
  /** Total number of frames */
  frames: number;
  /** Frames per second */
  fps: number;
  /** Duration in milliseconds */
  duration: number;
  /** Whether file is a low-quality proxy (e.g. transcoded for editing) */
  proxy: boolean;
}

export interface AudioMediaFile extends MediaFileBase {
  kind: 'audio';
}

export interface ImageMediaFile extends MediaFileBase {
  kind: 'image';
}

export type AnyMediaFile = VideoMediaFile | AudioMediaFile | ImageMediaFile;

/** VideoMediaFile with a resolved HTMLVideoElement and thumbnail URL */
export interface VideoMediaAsset extends VideoMediaFile {
  element: HTMLVideoElement;
  thumbnail: string;
}

/** AudioMediaFile with a resolved HTMLAudioElement */
export interface AudioMediaAsset extends AudioMediaFile {
  element: HTMLAudioElement;
}

/** ImageMediaFile with a resolved HTMLImageElement and object URL */
export interface ImageMediaAsset extends ImageMediaFile {
  element: HTMLImageElement;
  url: string;
}

export type AnyMediaAsset = VideoMediaAsset | AudioMediaAsset | ImageMediaAsset;

/** Emitted when the media library changes */
export type MediaChangeEvent =
  | { action: 'added'; files: AnyMediaFile[] }
  | { action: 'removed'; files: AnyMediaFile[] }
  | { action: 'placeholder' };
