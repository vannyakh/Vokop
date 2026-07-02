import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/features/project';
import { api } from '@/lib/api/client';
import type { StudioToolId } from '@/types';

interface ApplyPresetInput {
  tool: StudioToolId;
  presetId: string;
}

export function useEditorActions() {
  const videoSessionId = useAppStore((s) => s.videoSessionId);
  const currentTime = useAppStore((s) => s.currentTime);
  const setVideoFilter = useAppStore((s) => s.setVideoFilter);
  const setCaptionStylePreset = useAppStore((s) => s.setCaptionStylePreset);
  const applyAudioMixPreset = useAppStore((s) => s.applyAudioMixPreset);
  const applyClipTransition = useAppStore((s) => s.applyClipTransition);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);

  const mutation = useMutation({
    mutationFn: async ({ tool, presetId }: ApplyPresetInput) => {
      if (!videoSessionId) return { previewUrl: null as string | null };

      await api.applyEditorEdit(
        videoSessionId,
        tool,
        presetId,
        selectedTimelineClip?.clipId,
      );

      if (tool === 'filters' || tool === 'effects') {
        try {
          const preview = await api.previewEditorFilter(
            videoSessionId,
            tool === 'effects' ? 'effects' : 'filters',
            presetId,
            currentTime,
          );
          return { previewUrl: preview.image };
        } catch {
          return { previewUrl: null };
        }
      }

      return { previewUrl: null };
    },
    onError: (err) => {
      console.warn('[editor] server apply failed (local preview still active):', err);
    },
  });

  const applyPreset = useCallback(
    async (tool: StudioToolId, presetId: string) => {
      if (tool === 'filters') {
        setVideoFilter(presetId === 'original' ? null : presetId);
      } else if (tool === 'captions') {
        setCaptionStylePreset(presetId as 'none' | 'standard' | 'highlight' | 'karaoke');
      } else if (tool === 'audio') {
        applyAudioMixPreset(presetId);
      } else if (tool === 'transitions' && selectedTimelineClip) {
        applyClipTransition(selectedTimelineClip.clipId, presetId, 'in');
      }

      if (!videoSessionId) return;

      await mutation.mutateAsync({ tool, presetId });
    },
    [
      applyAudioMixPreset,
      applyClipTransition,
      mutation,
      selectedTimelineClip,
      setCaptionStylePreset,
      setVideoFilter,
      videoSessionId,
    ],
  );

  return {
    applyPreset,
    applying: mutation.isPending,
    previewUrl: mutation.data?.previewUrl ?? null,
    clearPreview: mutation.reset,
  };
}
