import {
  createProjectRequestSchema,
  projectsListResponseSchema,
  projectResponseSchema,
  toApiResponse,
  updateProjectRequestSchema,
  type UpdateProjectRequest,
} from '@vokop/api';
import {
  createProjectRecord,
  findProjectByIdForUser,
  listProjectsByUser,
  updateProjectRecord,
} from '../db/projects.js';
import { mapProject } from '../lib/mappers.js';

export async function getUserProjects(userId: string) {
  const projects = await listProjectsByUser(userId);
  return toApiResponse(projectsListResponseSchema, {
    projects: projects.map(mapProject),
  });
}

export async function getUserProject(userId: string, projectId: string) {
  const project = await findProjectByIdForUser(userId, projectId);
  if (!project) return null;
  return toApiResponse(projectResponseSchema, { project: mapProject(project) });
}

export async function createUserProject(
  userId: string,
  input: {
    title: string;
    sourceLang?: string;
    targetLang?: string;
    aspectRatio?: 'original' | '16:9' | '4:3' | '2:1' | '9:16' | '1:1' | '3:4';
    durationSec?: number;
    status?: 'done' | 'processing' | 'failed';
    progress?: number;
  },
) {
  const project = await createProjectRecord({
    userId,
    title: input.title,
    sourceLang: input.sourceLang ?? 'EN',
    targetLang: input.targetLang ?? 'KM',
    aspectRatio: input.aspectRatio ?? 'original',
    durationSec: input.durationSec,
    status: input.status,
    progress: input.progress,
  });
  return toApiResponse(projectResponseSchema, { project: mapProject(project) });
}

export async function updateUserProject(
  userId: string,
  projectId: string,
  input: UpdateProjectRequest,
) {
  const project = await updateProjectRecord(userId, projectId, input);
  if (!project) return null;
  return toApiResponse(projectResponseSchema, { project: mapProject(project) });
}

export function parseCreateProjectBody(body: unknown) {
  return createProjectRequestSchema.safeParse(body);
}

export function parseUpdateProjectBody(body: unknown) {
  return updateProjectRequestSchema.safeParse(body);
}
