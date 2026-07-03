import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { appendOpLog } from './oplog.js';

export type AssetKind = 'video' | 'audio' | 'image';
export type AssetStatus = 'pending' | 'ingesting' | 'ready' | 'error';

export interface LocalAsset {
  id: string;
  projectId: string;
  filename: string;
  kind: AssetKind;
  originalPath: string;
  proxyPath: string | null;
  thumbDir: string | null;
  waveformPath: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  size: number;
  status: AssetStatus;
  error: string | null;
  r2Key: string | null;
  uploadOffset: number | null;
  cloudId: string | null;
  createdAt: number;
  updatedAt: number;
}

function rowToAsset(row: Record<string, unknown>): LocalAsset {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    filename: row.filename as string,
    kind: row.kind as AssetKind,
    originalPath: row.original_path as string,
    proxyPath: (row.proxy_path as string | null) ?? null,
    thumbDir: (row.thumb_dir as string | null) ?? null,
    waveformPath: (row.waveform_path as string | null) ?? null,
    durationSec: (row.duration_sec as number | null) ?? null,
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    fps: (row.fps as number | null) ?? null,
    codec: (row.codec as string | null) ?? null,
    size: row.size as number,
    status: row.status as AssetStatus,
    error: (row.error as string | null) ?? null,
    r2Key: (row.r2_key as string | null) ?? null,
    uploadOffset: (row.upload_offset as number | null) ?? null,
    cloudId: (row.cloud_id as string | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export function listAssets(db: DatabaseSync, projectId: string): LocalAsset[] {
  const rows = db
    .prepare('SELECT * FROM assets WHERE project_id = ? ORDER BY created_at ASC')
    .all(projectId) as Record<string, unknown>[];
  return rows.map(rowToAsset);
}

export function getAsset(db: DatabaseSync, id: string): LocalAsset | null {
  const row = db.prepare('SELECT * FROM assets WHERE id=?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToAsset(row) : null;
}

export function createAsset(
  db: DatabaseSync,
  input: {
    projectId: string;
    filename: string;
    kind: AssetKind;
    originalPath: string;
    size: number;
  },
): LocalAsset {
  const now = Date.now();
  const asset: LocalAsset = {
    id: randomUUID(),
    projectId: input.projectId,
    filename: input.filename,
    kind: input.kind,
    originalPath: input.originalPath,
    proxyPath: null,
    thumbDir: null,
    waveformPath: null,
    durationSec: null,
    width: null,
    height: null,
    fps: null,
    codec: null,
    size: input.size,
    status: 'pending',
    error: null,
    r2Key: null,
    uploadOffset: null,
    cloudId: null,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(`
    INSERT INTO assets (
      id, project_id, filename, kind, original_path, size, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    asset.id, asset.projectId, asset.filename, asset.kind,
    asset.originalPath, asset.size, asset.status,
    asset.createdAt, asset.updatedAt,
  );

  appendOpLog(db, { entity: 'asset', entityId: asset.id, opType: 'create', payload: { projectId: input.projectId } });
  return asset;
}

export function updateAsset(
  db: DatabaseSync,
  id: string,
  patch: Partial<Omit<LocalAsset, 'id' | 'projectId' | 'createdAt'>>,
): LocalAsset | null {
  const existing = getAsset(db, id);
  if (!existing) return null;

  const now = Date.now();
  const u = { ...existing, ...patch, updatedAt: now };

  db.prepare(`
    UPDATE assets SET
      proxy_path=?, thumb_dir=?, waveform_path=?,
      duration_sec=?, width=?, height=?, fps=?, codec=?,
      status=?, error=?, r2_key=?, upload_offset=?, cloud_id=?,
      updated_at=?
    WHERE id=?
  `).run(
    u.proxyPath, u.thumbDir, u.waveformPath,
    u.durationSec, u.width, u.height, u.fps, u.codec,
    u.status, u.error, u.r2Key, u.uploadOffset, u.cloudId,
    u.updatedAt, id,
  );

  return u;
}

export function deleteAsset(db: DatabaseSync, id: string): boolean {
  const result = db.prepare('DELETE FROM assets WHERE id=?').run(id);
  if ((result as { changes: number }).changes > 0) {
    appendOpLog(db, { entity: 'asset', entityId: id, opType: 'delete', payload: null });
    return true;
  }
  return false;
}
