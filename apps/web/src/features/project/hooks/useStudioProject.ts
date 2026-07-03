import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AspectRatioId } from '@/types';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import { useAppStore } from '@/features/project/store/useAppStore';
import { api, queryKeys } from '@/lib/api';

const SAVE_DEBOUNCE_MS = 450;

function editorStateSignature(input: {
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  canvasElements: CanvasElement[];
  transcript: string;
  translatedText: string;
  duration: number;
  projectName: string;
  aspectRatio: AspectRatioId;
}): string {
  return JSON.stringify({
    title: input.projectName,
    aspectRatio: input.aspectRatio,
    durationSec: input.duration,
    videoClips: input.videoClips,
    audioClips: input.audioClips,
    // Persist layout/timing only — skip large blob/data URLs for images.
    canvasElements: input.canvasElements.map(({ src, ...rest }) =>
      src && (src.startsWith('blob:') || src.startsWith('data:'))
        ? { ...rest, src: undefined }
        : { ...rest, src },
    ),
    transcript: input.transcript,
    translatedText: input.translatedText,
  });
}

/**
 * Loads a project from the API, keeps status in sync with polling,
 * and persists local name/aspect-ratio/editor edits in near real time.
 */
export function useStudioProject(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const hydrateProject = useAppStore((s) => s.hydrateProject);
  const setProjectStatus = useAppStore((s) => s.setProjectStatus);
  const projectName = useAppStore((s) => s.projectName);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const storeProjectId = useAppStore((s) => s.projectId);
  const projectStatus = useAppStore((s) => s.projectStatus);
  const duration = useAppStore((s) => s.duration);
  const videoClips = useAppStore((s) => s.videoClips);
  const audioClips = useAppStore((s) => s.audioClips);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const transcript = useAppStore((s) => s.transcript);
  const translatedText = useAppStore((s) => s.translatedText);

  const skipNextSaveRef = useRef(false);
  const hydratedIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSigRef = useRef<string>('');

  const query = useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? 'none'),
    queryFn: async () => {
      const { project } = await api.getProject(projectId!);
      return project;
    },
    enabled: Boolean(projectId),
    staleTime: 2_000,
    refetchInterval: (current) => {
      const status = current.state.data?.status ?? projectStatus;
      return status === 'processing' ? 2_000 : false;
    },
  });

  useEffect(() => {
    if (!query.data) return;

    // Full hydrate only when opening a project (or switching ids).
    if (hydratedIdRef.current !== query.data.id) {
      skipNextSaveRef.current = true;
      hydratedIdRef.current = query.data.id;
      const editorState = query.data.editorState;
      hydrateProject({
        id: query.data.id,
        title: query.data.title,
        aspectRatio: query.data.aspectRatio as AspectRatioId,
        status: query.data.status,
        progress: query.data.progress,
        durationSec: query.data.durationSec,
        editorState: editorState
          ? {
              videoClips: editorState.videoClips as MediaClip[] | undefined,
              audioClips: editorState.audioClips as MediaClip[] | undefined,
              canvasElements: editorState.canvasElements as CanvasElement[] | undefined,
              transcript: editorState.transcript,
              translatedText: editorState.translatedText,
            }
          : undefined,
      });
      lastSavedSigRef.current = editorStateSignature({
        projectName: query.data.title,
        aspectRatio: query.data.aspectRatio as AspectRatioId,
        duration: query.data.durationSec ?? 30,
        videoClips: (editorState?.videoClips as MediaClip[] | undefined) ?? [],
        audioClips: (editorState?.audioClips as MediaClip[] | undefined) ?? [],
        canvasElements: (editorState?.canvasElements as CanvasElement[] | undefined) ?? [],
        transcript: editorState?.transcript ?? '',
        translatedText: editorState?.translatedText ?? '',
      });
      return;
    }

    // Real-time status/progress updates from polling.
    setProjectStatus(query.data.status, query.data.progress);
  }, [hydrateProject, query.data, setProjectStatus]);

  const updateMutation = useMutation({
    mutationFn: (input: {
      title?: string;
      aspectRatio?: AspectRatioId;
      status?: 'done' | 'processing' | 'failed';
      progress?: number;
      durationSec?: number;
      editorState?: {
        videoClips: MediaClip[];
        audioClips: MediaClip[];
        canvasElements: CanvasElement[];
        transcript: string;
        translatedText: string;
      };
    }) => api.updateProject(projectId!, input),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.projects.detail(projectId!), response.project);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
    },
  });

  const saveProject = updateMutation.mutate;
  const isSaving = updateMutation.isPending;

  useEffect(() => {
    if (!projectId || !storeProjectId || storeProjectId !== projectId) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (!projectName.trim()) return;

    const sig = editorStateSignature({
      projectName,
      aspectRatio,
      duration,
      videoClips,
      audioClips,
      canvasElements,
      transcript,
      translatedText,
    });
    if (sig === lastSavedSigRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastSavedSigRef.current = sig;
      const persistableCanvas = canvasElements.map(({ src, ...rest }) =>
        src && (src.startsWith('blob:') || src.startsWith('data:'))
          ? { ...rest, src: undefined }
          : { ...rest, src },
      ) as CanvasElement[];

      saveProject({
        title: projectName.trim(),
        aspectRatio,
        durationSec: duration,
        editorState: {
          videoClips,
          audioClips,
          canvasElements: persistableCanvas,
          transcript,
          translatedText,
        },
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    aspectRatio,
    audioClips,
    canvasElements,
    duration,
    projectId,
    projectName,
    saveProject,
    storeProjectId,
    transcript,
    translatedText,
    videoClips,
  ]);

  return {
    project: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    isSaving,
    refetch: query.refetch,
  };
}
