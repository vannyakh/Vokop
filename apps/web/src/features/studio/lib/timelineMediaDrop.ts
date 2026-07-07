import type { AddTextTemplateOptions } from '@/features/studio/constants/textTemplates';
import type { TextTemplateInput } from '@/features/studio/constants/textTemplates';
import { TEXT_TEMPLATE_DRAG_MIME } from '@/features/studio/constants/textTemplates';
import {
  MEDIA_ASSET_DRAG_MIME,
  parseMediaAssetDrag,
} from '@/features/studio/lib/mediaLibrary';
import {
  isTimelineExternalDrag,
  resolveEmptyTimelineDrop,
} from '@/features/studio/lib/timelineDrop';
import type { TimelineTrackType } from '@/features/studio/lib/timelineTypes';
import {
  isAudioLikeTimelineTrack,
  isTextTimelineTrack,
  isVisualTimelineTrack,
} from '@/features/studio/lib/timelineTrackUtils';
import { useAppStore } from '@/features/project/store/useAppStore';
import {
  getSubtitleFiles,
  importSubtitlesToProject,
} from '@/features/studio/lib/subtitles/importSubtitlesToProject';

export interface TimelineMediaDropActions {
  ensureTimelineTrackVisible: (trackId: string) => void;
  addMediaAssetToTimeline: (
    assetId: string,
    atTime?: number,
    options?: { trackId?: string },
  ) => void;
  addTextTemplate: (template: TextTemplateInput, options?: AddTextTemplateOptions) => void;
  importMediaFiles: (files: FileList | File[]) => Promise<void>;
}

export function previewDropHint(types: readonly string[]): string {
  const source = resolveEmptyTimelineDrop(types);
  if (types.includes(TEXT_TEMPLATE_DRAG_MIME)) return 'Drop to add text track';
  if (source.trackType === 'video') return 'Drop to add video track';
  if (source.trackType === 'audio' || source.trackType === 'sound') return 'Drop to add audio track';
  if (source.trackType === 'sticker') return 'Drop to add sticker track';
  return 'Drop to add image track';
}

/** Handle media/template/file drops onto the timeline or preview. */
export async function processTimelineMediaDrop(input: {
  dataTransfer: DataTransfer;
  atTime: number;
  trackId?: string;
  trackType?: TimelineTrackType;
  autoCreateTrack?: boolean;
  actions: TimelineMediaDropActions;
}): Promise<boolean> {
  const types = Array.from(input.dataTransfer.types);
  const files = input.dataTransfer.files?.length
    ? Array.from(input.dataTransfer.files)
    : undefined;
  if (!isTimelineExternalDrag(types, files)) return false;

  const subtitleFiles = getSubtitleFiles(files);
  if (subtitleFiles.length > 0) {
    const trackId = input.trackId ?? 'text';
    const trackType = input.trackType ?? 'text';
    if (!isTextTimelineTrack(String(trackId)) && trackType !== 'text') return false;
    input.actions.ensureTimelineTrackVisible('text');
    await importSubtitlesToProject({
      file: subtitleFiles[0]!,
      track: 'transcript',
      alignStartSec: input.atTime,
    });
    return true;
  }

  const resolved = resolveEmptyTimelineDrop(types, files);
  const trackId = input.trackId ?? resolved.trackId;
  const trackType = input.trackType ?? resolved.trackType;

  if (input.autoCreateTrack !== false && trackId !== 'audio') {
    input.actions.ensureTimelineTrackVisible(trackId);
  }

  const templateRaw = input.dataTransfer.getData(TEXT_TEMPLATE_DRAG_MIME);
  if (templateRaw) {
    try {
      const template = JSON.parse(templateRaw) as TextTemplateInput;
      const resolvedTrackId = useAppStore.getState().resolveTimelineDropTrack({
        trackId: String(trackId),
        trackType: 'text',
        atTime: input.atTime,
        duration: 4,
      });
      input.actions.addTextTemplate(template, {
        startTime: input.atTime,
        trackId: resolvedTrackId,
      });
      return true;
    } catch {
      return false;
    }
  }

  const assetRaw = input.dataTransfer.getData(MEDIA_ASSET_DRAG_MIME);
  if (assetRaw) {
    const parsed = parseMediaAssetDrag(assetRaw);
    if (parsed?.assetId) {
      input.actions.addMediaAssetToTimeline(parsed.assetId, input.atTime, {
        trackId: String(trackId),
      });
      return true;
    }
  }

  if (files?.length) {
    await input.actions.importMediaFiles(files);
    const assets = useAppStore.getState().mediaAssets;
    const newest = [...assets].reverse().find((asset) => {
      if (trackId === 'video' || trackType === 'video') return asset.kind === 'video';
      if (isAudioLikeTimelineTrack(trackId) || trackType === 'audio' || trackType === 'sound') {
        return asset.kind === 'audio';
      }
      if (isVisualTimelineTrack(trackId) || trackType === 'image' || trackType === 'sticker') {
        return asset.kind === 'image';
      }
      return true;
    });
    if (newest) {
      input.actions.addMediaAssetToTimeline(newest.id, input.atTime, { trackId: String(trackId) });
      return true;
    }
  }

  return false;
}
