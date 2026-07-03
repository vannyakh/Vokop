/**
 * Push local drafts to the cloud API.
 * Reads pending op_log entries and submits them as a batch.
 * After success, marks each op as synced.
 */

import type { DatabaseSync } from 'node:sqlite';
import { pendingOps, markOpsSynced } from '../local-db/oplog.js';
import { getProject, markProjectSynced } from '../local-db/projects.js';
import { getAsset, updateAsset } from '../local-db/assets.js';

export interface PushConfig {
  apiBaseUrl: string;
  authToken: string;
}

export interface PushResult {
  synced: number;
  failed: number;
  errors: string[];
}

export async function pushDrafts(db: DatabaseSync, config: PushConfig): Promise<PushResult> {
  const ops = pendingOps(db);
  if (!ops.length) return { synced: 0, failed: 0, errors: [] };

  const { apiBaseUrl, authToken } = config;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const syncedOpIds: string[] = [];

  for (const op of ops) {
    try {
      if (op.entity === 'project') {
        const project = getProject(db, op.entityId);
        if (!project) { syncedOpIds.push(op.opId); continue; }

        if (op.opType === 'create' || (op.opType === 'update' && !project.cloudId)) {
          // Create on cloud
          const res = await fetch(`${apiBaseUrl}/api/v1/projects`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: project.name, timeline: project.timeline }),
          });
          if (!res.ok) throw new Error(`Create project failed: ${res.status}`);
          const { project: created } = await res.json() as { project: { projectId: string } };
          markProjectSynced(db, project.id, created.projectId);
        } else if (op.opType === 'update' && project.cloudId) {
          // Update on cloud
          const res = await fetch(`${apiBaseUrl}/api/v1/projects/${project.cloudId}/timeline`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ timeline: project.timeline, version: project.version - 1 }),
          });
          if (!res.ok && res.status !== 409) throw new Error(`Update project failed: ${res.status}`);
        } else if (op.opType === 'delete' && project.cloudId) {
          await fetch(`${apiBaseUrl}/api/v1/projects/${project.cloudId}`, { method: 'DELETE', headers });
        }
      }

      syncedOpIds.push(op.opId);
      synced++;
    } catch (err) {
      failed++;
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (syncedOpIds.length > 0) {
    markOpsSynced(db, syncedOpIds);
  }

  return { synced, failed, errors };
}
