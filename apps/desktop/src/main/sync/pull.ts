/**
 * Pull cloud project manifest and merge into local DB.
 * Strategy: cloud wins for project metadata; local timeline wins if version >= cloud.
 */

import type { DatabaseSync } from 'node:sqlite';
import { getProject, createProject, updateProject, markProjectSynced } from '../local-db/projects.js';

export interface PullConfig {
  apiBaseUrl: string;
  authToken: string;
}

interface CloudProject {
  projectId: string;
  name: string;
  version: number;
  timeline: Record<string, unknown>;
  updatedAt: string;
}

export interface PullResult {
  created: number;
  updated: number;
  skipped: number;
}

export async function pullManifest(db: DatabaseSync, config: PullConfig): Promise<PullResult> {
  const { apiBaseUrl, authToken } = config;
  const res = await fetch(`${apiBaseUrl}/api/v1/projects`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) throw new Error(`Pull manifest failed: ${res.status}`);

  const { projects } = await res.json() as { projects: CloudProject[] };

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const cloud of projects) {
    // Find matching local project by cloudId
    const localMatches = db
      .prepare('SELECT * FROM projects WHERE cloud_id=?')
      .all(cloud.projectId) as { id: string; version: number }[];
    const local = localMatches[0];

    if (!local) {
      // New project from cloud — create locally
      const p = createProject(db, { name: cloud.name });
      updateProject(db, p.id, { timeline: cloud.timeline });
      markProjectSynced(db, p.id, cloud.projectId);
      created++;
    } else {
      // Existing: update if cloud version is ahead
      const localProject = getProject(db, local.id);
      if (localProject && cloud.version > localProject.version) {
        updateProject(db, local.id, {
          name: cloud.name,
          timeline: cloud.timeline,
        });
        updated++;
      } else {
        skipped++;
      }
    }
  }

  return { created, updated, skipped };
}
