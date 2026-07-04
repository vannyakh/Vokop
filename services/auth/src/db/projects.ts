import { ObjectId, type Filter } from 'mongodb';
import { getMongo } from '@vokop/db';
import type { ProjectDoc } from '../lib/mappers.js';

export const PROJECTS = 'projects';

export function projectsCol() {
  return getMongo().collection<ProjectDoc>(PROJECTS);
}

/** Active projects: no deletedAt (legacy docs) or deletedAt is null. */
const activeFilter: Filter<ProjectDoc> = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

const trashedFilter: Filter<ProjectDoc> = {
  deletedAt: { $type: 'date' },
};

export async function ensureProjectIndexes(): Promise<void> {
  const col = projectsCol();
  await col.createIndex({ userId: 1, updatedAt: -1 });
  await col.createIndex({ userId: 1, deletedAt: 1, updatedAt: -1 });
}

export async function listProjectsByUser(
  userId: string,
  options: { trash?: boolean; limit?: number } = {},
): Promise<ProjectDoc[]> {
  if (!ObjectId.isValid(userId)) return [];
  const limit = options.limit ?? 50;
  const scope = options.trash ? trashedFilter : activeFilter;
  return projectsCol()
    .find({ userId: new ObjectId(userId), ...scope })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function findProjectByIdForUser(
  userId: string,
  projectId: string,
  options: { includeTrash?: boolean } = {},
): Promise<ProjectDoc | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(projectId)) return null;
  const filter: Filter<ProjectDoc> = {
    _id: new ObjectId(projectId),
    userId: new ObjectId(userId),
  };
  if (!options.includeTrash) {
    Object.assign(filter, activeFilter);
  }
  return projectsCol().findOne(filter);
}

export async function createProjectRecord(input: {
  userId: string;
  title: string;
  sourceLang: string;
  targetLang: string;
  aspectRatio?: ProjectDoc['aspectRatio'];
  durationSec?: number;
  status?: ProjectDoc['status'];
  progress?: number;
}): Promise<ProjectDoc> {
  const now = new Date();
  const status = input.status ?? 'processing';
  const doc: ProjectDoc = {
    _id: new ObjectId(),
    userId: new ObjectId(input.userId),
    title: input.title,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang,
    aspectRatio: input.aspectRatio ?? 'original',
    status,
    progress: input.progress ?? (status === 'done' ? 100 : 0),
    durationSec: input.durationSec,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await projectsCol().insertOne(doc);
  return doc;
}

export async function updateProjectRecord(
  userId: string,
  projectId: string,
  patch: Partial<
    Pick<
      ProjectDoc,
      | 'title'
      | 'sourceLang'
      | 'targetLang'
      | 'aspectRatio'
      | 'durationSec'
      | 'status'
      | 'progress'
      | 'editorState'
    >
  >,
): Promise<ProjectDoc | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(projectId)) return null;

  const result = await projectsCol().findOneAndUpdate(
    {
      _id: new ObjectId(projectId),
      userId: new ObjectId(userId),
      ...activeFilter,
    },
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  );

  return result ?? null;
}

/** Soft-delete: move active project to trash. */
export async function softDeleteProjectRecord(
  userId: string,
  projectId: string,
): Promise<ProjectDoc | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(projectId)) return null;
  const now = new Date();
  const result = await projectsCol().findOneAndUpdate(
    {
      _id: new ObjectId(projectId),
      userId: new ObjectId(userId),
      ...activeFilter,
    },
    { $set: { deletedAt: now, updatedAt: now } },
    { returnDocument: 'after' },
  );
  return result ?? null;
}

/** Restore a trashed project. */
export async function restoreProjectRecord(
  userId: string,
  projectId: string,
): Promise<ProjectDoc | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(projectId)) return null;
  const result = await projectsCol().findOneAndUpdate(
    {
      _id: new ObjectId(projectId),
      userId: new ObjectId(userId),
      ...trashedFilter,
    },
    { $set: { deletedAt: null, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return result ?? null;
}

/** Permanent delete — only allowed for trashed projects. */
export async function permanentDeleteProjectRecord(
  userId: string,
  projectId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(projectId)) return false;
  const result = await projectsCol().deleteOne({
    _id: new ObjectId(projectId),
    userId: new ObjectId(userId),
    ...trashedFilter,
  });
  return result.deletedCount === 1;
}

/** Empty trash — permanently delete all soft-deleted projects for the user. */
export async function emptyTrashForUser(userId: string): Promise<number> {
  if (!ObjectId.isValid(userId)) return 0;
  const result = await projectsCol().deleteMany({
    userId: new ObjectId(userId),
    ...trashedFilter,
  });
  return result.deletedCount;
}
