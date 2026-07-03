/**
 * Typed Mongo collection accessors for video-tools.
 * Call getMongo() once databases are connected via @vokop/db.
 */

import { getMongo } from '@vokop/db';
import type { Collection, Document } from 'mongodb';

// ─── Document shapes ─────────────────────────────────────────────────────────

export interface ProjectDoc {
  _id?: string;
  projectId: string;
  ownerId: string;
  name: string;
  /** Timeline + canvas state (versioned JSON snapshot) */
  timeline: Document;
  /** Monotonically increasing version for optimistic locking */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetStatus = 'pending' | 'ingesting' | 'ready' | 'error';
export type AssetKind = 'video' | 'audio' | 'image';

export interface AssetDoc {
  assetId: string;
  projectId: string;
  ownerId: string;
  kind: AssetKind;
  filename: string;
  /** Size in bytes */
  size: number;
  status: AssetStatus;
  /** R2 object key (set after upload completes) */
  r2Key?: string;
  /** Public CDN URL (set after ingest completes) */
  publicUrl?: string;
  /** Probe data from ingest worker */
  probe?: {
    duration: number;
    width?: number;
    height?: number;
    codec?: string | null;
    fps?: number | null;
  };
  /** Filmstrip thumbnail URLs (set after ingest worker) */
  thumbnails?: string[];
  /** Waveform data URL (set after ingest worker, audio/video only) */
  waveformUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RenderJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface RenderJobDoc {
  jobId: string;
  projectId: string;
  ownerId: string;
  /** BullMQ job ID (for queue lookup) */
  bullJobId?: string;
  status: RenderJobStatus;
  progress: number;
  /** Timeline snapshot at time of export */
  timelineSnapshot: Document;
  /** Export settings (resolution, fps, format) */
  exportSettings: {
    format: 'mp4' | 'webm';
    resolution: '1080p' | '720p' | '480p' | 'original';
    fps: number;
  };
  /** R2 key of finished output file */
  outputKey?: string;
  /** Public download URL */
  outputUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Accessors ────────────────────────────────────────────────────────────────

export function projects(): Collection<ProjectDoc> {
  return getMongo().collection<ProjectDoc>('projects');
}

export function assets(): Collection<AssetDoc> {
  return getMongo().collection<AssetDoc>('assets');
}

export function renderJobs(): Collection<RenderJobDoc> {
  return getMongo().collection<RenderJobDoc>('render_jobs');
}

export function videoJobLogs(): Collection<Document> {
  return getMongo().collection('video_jobs');
}
