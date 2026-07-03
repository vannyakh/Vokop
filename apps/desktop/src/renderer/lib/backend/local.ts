/**
 * LocalBackend — implements IBackend via Electron IPC (window.electronApi).
 * Used exclusively in the desktop Electron renderer.
 */

import type {
  IBackend,
  ProjectRecord,
  ProjectInput,
  ProjectPatch,
  AssetRecord,
  ProbeResult,
  ExportJobInput,
  SyncResult,
  PullResult,
} from './types.js';

declare global {
  interface Window {
    electronApi: {
      project: {
        list(): Promise<ProjectRecord[]>;
        get(id: string): Promise<ProjectRecord | null>;
        create(input: ProjectInput): Promise<ProjectRecord>;
        update(id: string, patch: Record<string, unknown>): Promise<ProjectRecord | null>;
        delete(id: string): Promise<boolean>;
      };
      asset: {
        list(projectId: string): Promise<AssetRecord[]>;
        get(id: string): Promise<AssetRecord | null>;
        ingest(input: { projectId: string; filePath: string; filename: string; kind: 'video' | 'audio' | 'image' }): Promise<{ asset: AssetRecord }>;
        delete(id: string): Promise<boolean>;
        onIngestProgress(cb: (data: { percent: number; stage: string }) => void): () => void;
      };
      media: {
        openDialog(): Promise<string[]>;
      };
      ffmpeg: {
        probe(filePath: string): Promise<ProbeResult>;
        export(opts: Record<string, unknown>): Promise<{ outputPath: string }>;
        onExportProgress(cb: (data: { percent: number }) => void): () => void;
      };
      sync: {
        push(cfg: { apiBaseUrl: string; authToken: string }): Promise<SyncResult>;
        pull(cfg: { apiBaseUrl: string; authToken: string }): Promise<PullResult>;
      };
    };
  }
}

export class LocalBackend implements IBackend {
  private get api() {
    return window.electronApi;
  }

  listProjects() { return this.api.project.list(); }
  getProject(id: string) { return this.api.project.get(id); }
  createProject(input: ProjectInput) { return this.api.project.create(input); }
  updateProject(id: string, patch: ProjectPatch) {
    return this.api.project.update(id, patch as Record<string, unknown>);
  }
  deleteProject(id: string) { return this.api.project.delete(id); }

  listAssets(projectId: string) { return this.api.asset.list(projectId); }
  getAsset(id: string) { return this.api.asset.get(id); }

  async ingestFile(opts: {
    projectId: string;
    filePath?: string;
    filename: string;
    kind: 'video' | 'audio' | 'image';
    onProgress?: (percent: number, stage: string) => void;
  }): Promise<AssetRecord> {
    if (!opts.filePath) throw new Error('filePath is required for desktop ingest');
    let cleanup: (() => void) | undefined;
    if (opts.onProgress) {
      cleanup = this.api.asset.onIngestProgress(({ percent, stage }) => {
        opts.onProgress!(percent, stage);
      });
    }
    try {
      const { asset } = await this.api.asset.ingest({
        projectId: opts.projectId,
        filePath: opts.filePath,
        filename: opts.filename,
        kind: opts.kind,
      });
      return asset;
    } finally {
      cleanup?.();
    }
  }

  deleteAsset(id: string) { return this.api.asset.delete(id); }

  openFilePicker() { return this.api.media.openDialog(); }

  probeFile(filePath: string) { return this.api.ffmpeg.probe(filePath); }

  async exportTimeline(
    opts: ExportJobInput,
    onProgress?: (percent: number) => void,
  ): Promise<{ jobId: string; outputPath?: string }> {
    const jobId = crypto.randomUUID();
    let cleanup: (() => void) | undefined;
    if (onProgress) {
      cleanup = this.api.ffmpeg.onExportProgress(({ percent }) => onProgress(percent));
    }
    try {
      const { outputPath } = await this.api.ffmpeg.export({ ...opts, jobId } as Record<string, unknown>);
      return { jobId, outputPath };
    } finally {
      cleanup?.();
    }
  }

  syncPush(cfg: { apiBaseUrl: string; authToken: string }) { return this.api.sync.push(cfg); }
  syncPull(cfg: { apiBaseUrl: string; authToken: string }) { return this.api.sync.pull(cfg); }
}
