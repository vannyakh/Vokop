/**
 * RemoteBackend — implements IBackend via HTTP fetch to the Vokop API.
 * Used in the web app (apps/web) and as the cloud fallback on desktop
 * when the user is online and wants to sync / use cloud-only features.
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

export class RemoteBackend implements IBackend {
  constructor(private readonly baseUrl: string = '/api/v1') {}

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      credentials: 'include',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`API ${init?.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async listProjects() {
    const { projects } = await this.fetch<{ projects: ProjectRecord[] }>('/projects');
    return projects;
  }

  async getProject(id: string) {
    const { project } = await this.fetch<{ project: ProjectRecord }>(`/projects/${id}`);
    return project;
  }

  async createProject(input: ProjectInput) {
    const { project } = await this.fetch<{ project: ProjectRecord }>('/projects', {
      method: 'POST', body: JSON.stringify(input),
    });
    return project;
  }

  async updateProject(id: string, patch: ProjectPatch) {
    if (patch.timeline !== undefined) {
      const { project } = await this.fetch<{ project: ProjectRecord }>(`/projects/${id}/timeline`, {
        method: 'PATCH', body: JSON.stringify({ timeline: patch.timeline, version: patch.version }),
      });
      return project;
    }
    const { project } = await this.fetch<{ project: ProjectRecord }>(`/projects/${id}`, {
      method: 'PATCH', body: JSON.stringify(patch),
    });
    return project;
  }

  async deleteProject(id: string) {
    await this.fetch(`/projects/${id}`, { method: 'DELETE' });
    return true;
  }

  async listAssets(projectId: string) {
    const { assets } = await this.fetch<{ assets: AssetRecord[] }>(`/assets?projectId=${projectId}`);
    return assets;
  }

  async getAsset(id: string) {
    const { asset } = await this.fetch<{ asset: AssetRecord }>(`/assets/${id}`);
    return asset;
  }

  async ingestFile(opts: {
    projectId: string;
    file?: File;
    filename: string;
    kind: 'video' | 'audio' | 'image';
    onProgress?: (percent: number, stage: string) => void;
  }): Promise<AssetRecord> {
    if (!opts.file) throw new Error('file is required for web ingest');

    // 1. Presign
    const { assetId, uploadUrl } = await this.fetch<{ assetId: string; uploadUrl: string; r2Key: string }>(
      '/assets/presign',
      {
        method: 'POST',
        body: JSON.stringify({
          filename: opts.filename,
          contentType: opts.file.type || 'application/octet-stream',
          projectId: opts.projectId,
          size: opts.file.size,
        }),
      },
    );

    opts.onProgress?.(10, 'Uploading');

    // 2. Upload direct to R2
    await fetch(uploadUrl, { method: 'PUT', body: opts.file });
    opts.onProgress?.(80, 'Processing');

    // 3. Notify complete → triggers ingest job
    const { asset } = await this.fetch<{ asset: AssetRecord }>(`/assets/${assetId}/complete`, {
      method: 'POST',
    });
    opts.onProgress?.(100, 'Done');
    return asset;
  }

  async deleteAsset(id: string) {
    await this.fetch(`/assets/${id}`, { method: 'DELETE' });
    return true;
  }

  async openFilePicker(): Promise<string[]> {
    // In the browser, we trigger a file input — return nothing (caller handles File objects).
    return [];
  }

  async probeFile(_filePath: string): Promise<ProbeResult> {
    throw new Error('probeFile is not available in the web backend. Use video session probe instead.');
  }

  async exportTimeline(
    opts: ExportJobInput,
    _onProgress?: (percent: number) => void,
  ): Promise<{ jobId: string; outputPath?: string }> {
    const { job } = await this.fetch<{ job: { jobId: string } }>(
      `/projects/${opts.projectId}/export`,
      { method: 'POST', body: JSON.stringify(opts) },
    );
    return { jobId: job.jobId };
  }

  async syncPush(_cfg: unknown): Promise<SyncResult> {
    return { synced: 0, failed: 0, errors: ['syncPush is not available in RemoteBackend'] };
  }

  async syncPull(_cfg: unknown): Promise<PullResult> {
    return { created: 0, updated: 0, skipped: 0 };
  }
}
