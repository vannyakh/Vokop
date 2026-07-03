import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { appendOpLog } from './oplog.js';

export interface LocalProject {
  id: string;
  name: string;
  aspectRatio: string;
  durationSec: number;
  timeline: Record<string, unknown>;
  version: number;
  cloudId: string | null;
  syncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

function rowToProject(row: Record<string, unknown>): LocalProject {
  return {
    id: row.id as string,
    name: row.name as string,
    aspectRatio: row.aspect_ratio as string,
    durationSec: row.duration_sec as number,
    timeline: JSON.parse((row.timeline_json as string) || '{}') as Record<string, unknown>,
    version: row.version as number,
    cloudId: (row.cloud_id as string | null) ?? null,
    syncedAt: (row.synced_at as number | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export function listProjects(db: DatabaseSync): LocalProject[] {
  const rows = db
    .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
    .all() as Record<string, unknown>[];
  return rows.map(rowToProject);
}

export function getProject(db: DatabaseSync, id: string): LocalProject | null {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToProject(row) : null;
}

export function createProject(
  db: DatabaseSync,
  input: { name: string; aspectRatio?: string },
): LocalProject {
  const now = Date.now();
  const project: LocalProject = {
    id: randomUUID(),
    name: input.name,
    aspectRatio: input.aspectRatio ?? '16:9',
    durationSec: 0,
    timeline: {},
    version: 1,
    cloudId: null,
    syncedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(`
    INSERT INTO projects (id, name, aspect_ratio, duration_sec, timeline_json, version, cloud_id, synced_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    project.id, project.name, project.aspectRatio,
    project.durationSec, JSON.stringify(project.timeline),
    project.version, project.cloudId, project.syncedAt,
    project.createdAt, project.updatedAt,
  );

  appendOpLog(db, { entity: 'project', entityId: project.id, opType: 'create', payload: project });
  return project;
}

export function updateProject(
  db: DatabaseSync,
  id: string,
  patch: Partial<Pick<LocalProject, 'name' | 'aspectRatio' | 'durationSec' | 'timeline'>>,
): LocalProject | null {
  const existing = getProject(db, id);
  if (!existing) return null;

  const now = Date.now();
  const updated = { ...existing, ...patch, version: existing.version + 1, updatedAt: now };

  db.prepare(`
    UPDATE projects SET
      name=?, aspect_ratio=?, duration_sec=?, timeline_json=?,
      version=?, updated_at=?
    WHERE id=?
  `).run(
    updated.name, updated.aspectRatio, updated.durationSec,
    JSON.stringify(updated.timeline), updated.version,
    updated.updatedAt, id,
  );

  appendOpLog(db, { entity: 'project', entityId: id, opType: 'update', payload: patch });
  return updated;
}

/** Mark project as synced with the cloud (sets cloud_id + synced_at). */
export function markProjectSynced(db: DatabaseSync, id: string, cloudId: string): void {
  db.prepare('UPDATE projects SET cloud_id=?, synced_at=? WHERE id=?')
    .run(cloudId, Date.now(), id);
}

export function deleteProject(db: DatabaseSync, id: string): boolean {
  const result = db.prepare('DELETE FROM projects WHERE id=?').run(id);
  if ((result as { changes: number }).changes > 0) {
    appendOpLog(db, { entity: 'project', entityId: id, opType: 'delete', payload: null });
    return true;
  }
  return false;
}
