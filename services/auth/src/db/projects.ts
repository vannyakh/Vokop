import { ObjectId } from 'mongodb';
import { getMongo } from '@vokop/db';
import type { ProjectDoc } from '../lib/mappers.js';

export const PROJECTS = 'projects';

export function projectsCol() {
  return getMongo().collection<ProjectDoc>(PROJECTS);
}

export async function ensureProjectIndexes(): Promise<void> {
  const db = getMongo();
  await db.collection(PROJECTS).createIndex({ userId: 1, updatedAt: -1 });
}

export async function listProjectsByUser(userId: string, limit = 20): Promise<ProjectDoc[]> {
  if (!ObjectId.isValid(userId)) return [];
  return projectsCol()
    .find({ userId: new ObjectId(userId) })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function findProjectByIdForUser(
  userId: string,
  projectId: string,
): Promise<ProjectDoc | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(projectId)) return null;
  return projectsCol().findOne({
    _id: new ObjectId(projectId),
    userId: new ObjectId(userId),
  });
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
    { _id: new ObjectId(projectId), userId: new ObjectId(userId) },
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
