import { randomUUID } from 'node:crypto';
import { projects } from '../../db/collections.js';
import type { ProjectDoc } from '../../db/collections.js';

export async function createProject(
  ownerId: string,
  name: string,
  timeline: Record<string, unknown> = {},
): Promise<ProjectDoc> {
  const now = new Date();
  const doc: ProjectDoc = {
    projectId: randomUUID(),
    ownerId,
    name,
    timeline,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  await projects().insertOne(doc);
  return doc;
}

export async function getProject(projectId: string): Promise<ProjectDoc | null> {
  return projects().findOne({ projectId });
}

export async function listProjects(ownerId: string): Promise<ProjectDoc[]> {
  return projects().find({ ownerId }, { sort: { updatedAt: -1 } }).toArray();
}

export async function updateProjectMeta(
  projectId: string,
  ownerId: string,
  name: string,
): Promise<ProjectDoc | null> {
  const result = await projects().findOneAndUpdate(
    { projectId, ownerId },
    { $set: { name, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return result ?? null;
}

/**
 * Versioned timeline save using optimistic locking.
 * Rejects with 409 if the client's `fromVersion` doesn't match the stored version.
 */
export async function saveTimeline(
  projectId: string,
  ownerId: string,
  timeline: Record<string, unknown>,
  fromVersion: number,
): Promise<{ doc: ProjectDoc; version: number }> {
  const newVersion = fromVersion + 1;
  const result = await projects().findOneAndUpdate(
    { projectId, ownerId, version: fromVersion },
    {
      $set: { timeline, updatedAt: new Date() },
      $inc: { version: 1 },
    },
    { returnDocument: 'after' },
  );

  if (!result) {
    const current = await projects().findOne({ projectId, ownerId });
    if (!current) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    throw Object.assign(
      new Error(`Version conflict: expected ${fromVersion}, got ${current.version}`),
      { statusCode: 409 },
    );
  }

  return { doc: result, version: newVersion };
}

export async function deleteProject(projectId: string, ownerId: string): Promise<boolean> {
  const result = await projects().deleteOne({ projectId, ownerId });
  return result.deletedCount > 0;
}
