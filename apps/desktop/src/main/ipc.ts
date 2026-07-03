/**
 * IPC channel registry.
 * All ipcMain.handle() calls live here — keeps main/index.ts clean.
 *
 * Channel naming convention:  <domain>:<action>
 *   project:list, project:get, project:create, project:update, project:delete
 *   asset:list, asset:get, asset:ingest, asset:delete
 *   media:open-dialog
 *   ffmpeg:probe
 *   ffmpeg:export           (streams progress via ipcMain.emit → webContents.send)
 *   sync:push, sync:pull
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { listProjects, getProject, createProject, updateProject, deleteProject } from './local-db/projects.js';
import { listAssets, getAsset, deleteAsset } from './local-db/assets.js';
import { ingestFile } from './media-store/ingest.js';
import { probeVideo } from './ffmpeg/probe.js';
import { exportTimeline, type ExportOptions } from './ffmpeg/export.js';
import { pushDrafts } from './sync/push.js';
import { pullManifest } from './sync/pull.js';

export function registerIpcHandlers(db: DatabaseSync): void {
  // ─── Projects ────────────────────────────────────────────────────────────
  ipcMain.handle('project:list', () => listProjects(db));

  ipcMain.handle('project:get', (_e, id: string) => getProject(db, id));

  ipcMain.handle('project:create', (_e, input: { name: string; aspectRatio?: string }) =>
    createProject(db, input),
  );

  ipcMain.handle('project:update', (_e, id: string, patch: Parameters<typeof updateProject>[2]) =>
    updateProject(db, id, patch),
  );

  ipcMain.handle('project:delete', (_e, id: string) => deleteProject(db, id));

  // ─── Assets ──────────────────────────────────────────────────────────────
  ipcMain.handle('asset:list', (_e, projectId: string) => listAssets(db, projectId));

  ipcMain.handle('asset:get', (_e, id: string) => getAsset(db, id));

  ipcMain.handle(
    'asset:ingest',
    async (event, input: { projectId: string; filePath: string; filename: string; kind: 'video' | 'audio' | 'image' }) => {
      return ingestFile(db, input, (percent, stage) => {
        event.sender.send('asset:ingest:progress', { percent, stage });
      });
    },
  );

  ipcMain.handle('asset:delete', (_e, id: string) => deleteAsset(db, id));

  // ─── Media dialogs ────────────────────────────────────────────────────────
  ipcMain.handle('media:open-dialog', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import Media',
      filters: [
        { name: 'Video', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv'] },
        { name: 'Audio', extensions: ['mp3', 'aac', 'wav', 'ogg', 'flac'] },
        { name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'All Media', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'aac', 'wav', 'jpg', 'png', 'gif'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });
    return result.canceled ? [] : result.filePaths;
  });

  // ─── FFmpeg ───────────────────────────────────────────────────────────────
  ipcMain.handle('ffmpeg:probe', (_e, filePath: string) => probeVideo(filePath));

  ipcMain.handle('ffmpeg:export', async (event, opts: ExportOptions) => {
    const outputPath = await exportTimeline({
      ...opts,
      onProgress: (percent) => {
        event.sender.send('ffmpeg:export:progress', { percent });
      },
    });
    return { outputPath };
  });

  // ─── Sync ─────────────────────────────────────────────────────────────────
  ipcMain.handle('sync:push', (_e, cfg: { apiBaseUrl: string; authToken: string }) =>
    pushDrafts(db, cfg),
  );

  ipcMain.handle('sync:pull', (_e, cfg: { apiBaseUrl: string; authToken: string }) =>
    pullManifest(db, cfg),
  );
}
