import type { ObjectId } from 'mongodb';
import type { Project } from '@vokop/api';

export interface ProjectDoc {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  sourceLang: string;
  targetLang: string;
  aspectRatio?: Project['aspectRatio'];
  status: 'done' | 'processing' | 'failed';
  progress?: number;
  durationSec?: number;
  thumbnailUrl?: string;
  editorState?: Project['editorState'];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toIso(date: Date): string {
  return date.toISOString();
}

export function mapProject(doc: ProjectDoc): Project {
  return {
    id: doc._id.toString(),
    title: doc.title,
    sourceLang: doc.sourceLang,
    targetLang: doc.targetLang,
    aspectRatio: doc.aspectRatio ?? 'original',
    status: doc.status,
    progress: doc.progress ?? undefined,
    durationSec: doc.durationSec ?? undefined,
    thumbnailUrl: doc.thumbnailUrl ?? undefined,
    editorState: doc.editorState ?? undefined,
    deletedAt: doc.deletedAt ? toIso(doc.deletedAt) : null,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}
