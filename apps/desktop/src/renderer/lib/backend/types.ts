/**
 * IBackend — the single interface both LocalBackend (Electron IPC) and
 * RemoteBackend (HTTP fetch) must satisfy.
 *
 * Components and hooks call useBackend() and never reference fetch or ipcRenderer directly.
 */

export interface ProjectInput {
  name: string;
  aspectRatio?: string;
}

export interface ProjectPatch {
  name?: string;
  aspectRatio?: string;
  durationSec?: number;
  timeline?: Record<string, unknown>;
  /** For optimistic-lock versioned saves */
  version?: number;
}

export interface AssetRecord {
  id: string;
  projectId: string;
  filename: string;
  kind: 'video' | 'audio' | 'image';
  originalPath?: string;
  proxyPath?: string | null;
  thumbDir?: string | null;
  waveformPath?: string | null;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  codec?: string | null;
  size: number;
  status: 'pending' | 'ingesting' | 'ready' | 'error';
  error?: string | null;
  r2Key?: string | null;
  cloudId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectRecord {
  id: string;
  name: string;
  aspectRatio: string;
  durationSec: number;
  timeline: Record<string, unknown>;
  version: number;
  cloudId?: string | null;
  syncedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  codec: string | null;
  fps: number | null;
  hasAudio: boolean;
}

export interface ExportJobInput {
  projectId: string;
  clips: unknown[];
  canvasWidth: number;
  canvasHeight: number;
  durationSec: number;
  fps: number;
  format: 'mp4' | 'webm';
  resolution: '1080p' | '720p' | '480p' | 'original';
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface PullResult {
  created: number;
  updated: number;
  skipped: number;
}

export interface IBackend {
  // ── Projects ────────────────────────────────────────────────────────────
  listProjects(): Promise<ProjectRecord[]>;
  getProject(id: string): Promise<ProjectRecord | null>;
  createProject(input: ProjectInput): Promise<ProjectRecord>;
  updateProject(id: string, patch: ProjectPatch): Promise<ProjectRecord | null>;
  deleteProject(id: string): Promise<boolean>;

  // ── Assets ──────────────────────────────────────────────────────────────
  listAssets(projectId: string): Promise<AssetRecord[]>;
  getAsset(id: string): Promise<AssetRecord | null>;
  /**
   * Import a file into the media library.
   * On desktop: triggers local ingest pipeline.
   * On web: opens upload dialog / presign flow.
   */
  ingestFile(opts: {
    projectId: string;
    filePath?: string;   // desktop only
    file?: File;         // web only
    filename: string;
    kind: 'video' | 'audio' | 'image';
    onProgress?: (percent: number, stage: string) => void;
  }): Promise<AssetRecord>;
  deleteAsset(id: string): Promise<boolean>;

  /** Open a native file picker (desktop) or a browser <input> (web). */
  openFilePicker(): Promise<string[]>;

  // ── FFmpeg ───────────────────────────────────────────────────────────────
  probeFile(filePath: string): Promise<ProbeResult>;
  exportTimeline(
    opts: ExportJobInput,
    onProgress?: (percent: number) => void,
  ): Promise<{ jobId: string; outputPath?: string }>;

  // ── Sync (desktop only — no-ops on web) ──────────────────────────────────
  syncPush(cfg: { apiBaseUrl: string; authToken: string }): Promise<SyncResult>;
  syncPull(cfg: { apiBaseUrl: string; authToken: string }): Promise<PullResult>;
}
