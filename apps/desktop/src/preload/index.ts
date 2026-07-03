/**
 * Preload script — runs in renderer context with Node access.
 * Exposes a typed `window.electronApi` via contextBridge.
 * ONLY explicitly listed channels are allowed — no raw ipcRenderer access.
 */

import { contextBridge, ipcRenderer } from 'electron';

// ─── Type-safe bridge API ─────────────────────────────────────────────────────

export type ElectronApi = typeof api;

const api = {
  // ── Projects ──────────────────────────────────────────────────────────────
  project: {
    list: () => ipcRenderer.invoke('project:list'),
    get: (id: string) => ipcRenderer.invoke('project:get', id),
    create: (input: { name: string; aspectRatio?: string }) =>
      ipcRenderer.invoke('project:create', input),
    update: (id: string, patch: Record<string, unknown>) =>
      ipcRenderer.invoke('project:update', id, patch),
    delete: (id: string) => ipcRenderer.invoke('project:delete', id),
  },

  // ── Assets ────────────────────────────────────────────────────────────────
  asset: {
    list: (projectId: string) => ipcRenderer.invoke('asset:list', projectId),
    get: (id: string) => ipcRenderer.invoke('asset:get', id),
    ingest: (input: {
      projectId: string;
      filePath: string;
      filename: string;
      kind: 'video' | 'audio' | 'image';
    }) => ipcRenderer.invoke('asset:ingest', input),
    delete: (id: string) => ipcRenderer.invoke('asset:delete', id),
    onIngestProgress: (cb: (data: { percent: number; stage: string }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, data: { percent: number; stage: string }) => cb(data);
      ipcRenderer.on('asset:ingest:progress', listener);
      return () => ipcRenderer.removeListener('asset:ingest:progress', listener);
    },
  },

  // ── Media dialogs ─────────────────────────────────────────────────────────
  media: {
    openDialog: (): Promise<string[]> => ipcRenderer.invoke('media:open-dialog'),
  },

  // ── FFmpeg ────────────────────────────────────────────────────────────────
  ffmpeg: {
    probe: (filePath: string) => ipcRenderer.invoke('ffmpeg:probe', filePath),
    export: (opts: Record<string, unknown>) => ipcRenderer.invoke('ffmpeg:export', opts),
    onExportProgress: (cb: (data: { percent: number }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, data: { percent: number }) => cb(data);
      ipcRenderer.on('ffmpeg:export:progress', listener);
      return () => ipcRenderer.removeListener('ffmpeg:export:progress', listener);
    },
  },

  // ── Sync ──────────────────────────────────────────────────────────────────
  sync: {
    push: (cfg: { apiBaseUrl: string; authToken: string }) =>
      ipcRenderer.invoke('sync:push', cfg),
    pull: (cfg: { apiBaseUrl: string; authToken: string }) =>
      ipcRenderer.invoke('sync:pull', cfg),
  },
};

contextBridge.exposeInMainWorld('electronApi', api);
