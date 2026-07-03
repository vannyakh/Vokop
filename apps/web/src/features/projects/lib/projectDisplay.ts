import type { Project } from '@vokop/api';

export type RecentProjectThumb = 't1' | 't2' | 't3' | 't4' | 't5';

export interface RecentProjectItem {
  id: string;
  title: string;
  lang: string;
  meta: string;
  duration: string;
  status: Project['status'];
  thumb: RecentProjectThumb;
}

const THUMBS: RecentProjectThumb[] = ['t1', 't2', 't3', 't4', 't5'];

export function thumbForProjectId(id: string): RecentProjectThumb {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % THUMBS.length;
  }
  return THUMBS[hash] ?? 't1';
}

export function formatProjectDuration(durationSec?: number): string {
  if (durationSec == null || !Number.isFinite(durationSec)) return '—';
  const total = Math.max(0, Math.floor(durationSec));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatProjectLang(sourceLang: string, targetLang: string): string {
  return `${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()}`;
}

export function formatProjectMeta(project: Project): string {
  if (project.status === 'processing') {
    const progress = project.progress ?? 0;
    return `processing — ${progress}%`;
  }
  return formatRelativeTime(project.updatedAt);
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function mapProjectToRecentItem(project: Project): RecentProjectItem {
  return {
    id: project.id,
    title: project.title,
    lang: formatProjectLang(project.sourceLang, project.targetLang),
    meta: formatProjectMeta(project),
    duration: formatProjectDuration(project.durationSec),
    status: project.status,
    thumb: thumbForProjectId(project.id),
  };
}
