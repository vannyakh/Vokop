import { create } from 'zustand';
import type { EditorTab, ProcessingStatus, VideoAnalysis, AspectRatioId, StudioToolId } from '@/types';
import type { CaptionStyle } from '@/features/studio/lib/exportSettings';
import {
  DEFAULT_PROJECT_EDITOR_STATE,
  findEditorPreset,
  getFilterCss,
  type ProjectEditorState,
} from '@vokop/shared';
import { DEFAULT_VOICE, VOICES } from '@/features/translation/constants/voices';
import { extractSpeakers } from '@/lib/utils/transcript';
import { updateSegmentText, parseSegments, updateSegmentTime, updateSegmentDuration, removeSegment, addSegmentAtTime, splitSegmentAtTime, getSegmentIndexAtTime } from '@/lib/utils/transcript';
import type {
  ExtraTimelineTrack,
  ExtraTrackType,
  MediaClip,
  TimelineSelectionItem,
  TimelineTrackId,
} from '@/features/studio/lib/timelineTypes';
import {
  DEFAULT_TIMELINE_TRACK_ORDER,
  isCoreTimelineTrack,
  isDeletableTimelineTrack,
  TRACK_TYPE_LABELS,
} from '@/features/studio/lib/timelineTypes';
import {
  isAudioLikeTimelineTrack,
  isTextTimelineTrack,
  isVisualTimelineTrack,
  moveTrackInOrder,
  trackTypeFromId,
} from '@/features/studio/lib/timelineTrackUtils';
import {
  buildTimelineSelection,
  pruneTimelineSelection,
  resolveTimelineSelectionItems,
  toggleTimelineSelectionItem,
  type TimelineSelectMode,
} from '@/features/studio/lib/timelineSelection';
import { createKeyframeAtOffset } from '@/features/studio/lib/keyframeUtils';
import type { CanvasElement, CanvasTool } from '@/types/canvas';
import { defaultProjectName, detectAspectRatioId } from '@/features/studio/constants/aspectRatios';
import {
  computeTimelineDuration,
  createMediaClip,
  findClipAtTime,
  splitMediaClipAt,
  timelineToSourceTime,
} from '@/features/studio/lib/mediaClips';
import { getTimelineVideo } from '@/features/studio/lib/timelinePlaybackBridge';
import {
  forgetMediaFile,
  getMediaFile,
  kindFromFile,
  probeMediaMeta,
  storeMediaFile,
  type MediaAsset,
} from '@/features/studio/lib/mediaLibrary';
import {
  hydrateMediaFromOpfs,
  persistMediaToOpfs,
  removeMediaFromOpfs,
} from '@/features/studio/lib/opfsMediaCache';
import { isTranscriptReady } from '@/features/studio/lib/transcriptReady';
import {
  cloneProjectSnapshot,
  pushProjectHistory,
  type ProjectSnapshot,
} from '@/features/studio/lib/projectHistory';
import type { TextTemplateInput, AddTextTemplateOptions } from '@/features/studio/constants/textTemplates';
import { computeTemplatePlacement, estimateCanvasSize } from '@/features/studio/lib/textTemplatePlacement';

export type AddCanvasImageOptions = {
  keepStudioTool?: boolean;
  width?: number;
  height?: number;
  label?: string;
  startTime?: number;
  endTime?: number;
  trackId?: string;
};

function selectionWithCanvasSync(
  state: { canvasElements: CanvasElement[]; selectedCanvasElementId: string | null },
  selection: ReturnType<typeof buildTimelineSelection>,
  syncCanvas: boolean,
): ReturnType<typeof buildTimelineSelection> & {
  selectedCanvasElementId?: string | null;
} {
  if (!syncCanvas) return selection;
  const primaryId = selection.selectedTimelineClip?.clipId;
  const isCanvas =
    Boolean(primaryId) && state.canvasElements.some((el) => el.id === primaryId);
  return {
    ...selection,
    selectedCanvasElementId: isCanvas ? primaryId! : null,
  };
}

function selectionAfterRemovingClip(
  state: {
    selectedTimelineClip: TimelineSelectionItem | null;
    selectedTimelineClips: TimelineSelectionItem[];
    selectedCanvasElementId: string | null;
    canvasElements: CanvasElement[];
  },
  clipId: string,
) {
  const selection = pruneTimelineSelection(
    state.selectedTimelineClip,
    state.selectedTimelineClips,
    (item) => item.clipId === clipId,
  );
  return selectionWithCanvasSync(state, selection, true);
}

function resolveVisualTrackId(
  state: {
    selectedTimelineClip: TimelineSelectionItem | null;
  },
  preferred: 'image' | 'sticker' = 'image',
): string {
  const tid = state.selectedTimelineClip?.trackId;
  if (!tid) return preferred;
  const id = String(tid);
  if (
    id === preferred ||
    id.startsWith(`${preferred}-`) ||
    id === 'overlay' ||
    id.startsWith('overlay-') ||
    id === 'image' ||
    id.startsWith('image-') ||
    id === 'sticker' ||
    id.startsWith('sticker-') ||
    id === 'effect' ||
    id.startsWith('effect-')
  ) {
    return id === 'overlay' || id.startsWith('overlay-') ? preferred : id;
  }
  return preferred;
}

function buildCanvasImageElement(
  state: {
    canvasElements: CanvasElement[];
    duration: number;
    currentTime: number;
    selectedTimelineClip: TimelineSelectionItem | null;
  },
  src: string,
  label: string,
  options?: AddCanvasImageOptions,
): CanvasElement {
  const duration = state.duration || 3600;
  const startTime = options?.startTime ?? state.currentTime;
  const endTime = options?.endTime ?? Math.min(duration, startTime + 4);
  const w = options?.width ?? 160;
  const h = options?.height ?? 160;
  return {
    id: `image-${Date.now()}`,
    type: 'image',
    text: label,
    src,
    x: 40,
    y: 40,
    width: w,
    height: h,
    fontSize: 0,
    rotation: 0,
    opacity: 1,
    startTime,
    endTime,
    trackId:
      options?.trackId ??
      resolveVisualTrackId(state, options?.label?.toLowerCase().includes('sticker') ? 'sticker' : 'image'),
  };
}

function snapshotFromState(state: {
  canvasElements: CanvasElement[];
  transcript: string;
  translatedText: string;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  extraTimelineTracks: ExtraTimelineTrack[];
}): ProjectSnapshot {
  return {
    canvasElements: state.canvasElements,
    transcript: state.transcript,
    translatedText: state.translatedText,
    videoClips: state.videoClips,
    audioClips: state.audioClips,
    extraTimelineTracks: state.extraTimelineTracks,
  };
}

function pushHistory(state: {
  canvasElements: CanvasElement[];
  transcript: string;
  translatedText: string;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  extraTimelineTracks: ExtraTimelineTrack[];
  projectUndoStack: ProjectSnapshot[];
}) {
  return {
    projectUndoStack: pushProjectHistory(state.projectUndoStack, snapshotFromState(state)),
    projectRedoStack: [] as ProjectSnapshot[],
  };
}

function applySnapshot(snapshot: ProjectSnapshot) {
  return {
    canvasElements: snapshot.canvasElements,
    transcript: snapshot.transcript,
    translatedText: snapshot.translatedText,
    videoClips: snapshot.videoClips,
    audioClips: snapshot.audioClips,
    extraTimelineTracks: snapshot.extraTimelineTracks,
  };
}

function withTimelineDuration<T extends {
  mediaDuration: number;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  duration: number;
}>(state: T, patch: Partial<Pick<T, 'videoClips' | 'audioClips' | 'mediaDuration' | 'duration'>>) {
  const mediaDuration = patch.mediaDuration ?? state.mediaDuration;
  const videoClips = patch.videoClips ?? state.videoClips;
  const audioClips = patch.audioClips ?? state.audioClips;
  const fallback = patch.duration ?? state.duration;
  return {
    ...patch,
    mediaDuration,
    videoClips,
    audioClips,
    duration: computeTimelineDuration(mediaDuration, [...videoClips, ...audioClips], fallback),
  };
}

function syncVideoToTimeline(clips: MediaClip[], time: number, playing: boolean) {
  const video = getTimelineVideo();
  if (!video) return;

  const sourceTime = timelineToSourceTime(clips, time);
  if (sourceTime == null) {
    if (!video.paused) video.pause();
    return;
  }

  if (Math.abs(video.currentTime - sourceTime) > 0.04) {
    video.currentTime = sourceTime;
  }

  if (playing && video.paused) void video.play().catch(() => undefined);
  if (!playing && !video.paused) video.pause();
}

interface AppState {
  videoFile: File | null;
  videoUrl: string | null;
  transcript: string;
  translatedText: string;
  targetLang: string;
  selectedVoice: string;
  speakerVoices: Record<string, string>;
  detectedSpeakers: string[];
  audioBase64: string | null;
  analysisAudio: string | null;
  reelAudioCache: Record<number, string>;
  detectedLanguage: string | null;
  videoAnalysis: VideoAnalysis | null;
  originalVolume: number;
  voiceVolume: number;
  isAudioPlaying: boolean;
  isPlayingAnalysis: boolean;
  isSyncPlaying: boolean;
  isReelMode: boolean;
  currentReelStep: number;
  previewingSpeaker: string | null;
  currentTime: number;
  duration: number;
  status: ProcessingStatus;
  errorMessage: string;
  isExporting: boolean;
  sidebarOpen: boolean;
  editorOpen: boolean;
  activeTab: EditorTab;
  projectId: string | null;
  projectName: string;
  projectStatus: 'done' | 'processing' | 'failed' | null;
  projectProgress: number;
  aspectRatio: AspectRatioId;
  videoWidth: number;
  videoHeight: number;
  captionPosition: { x: number; y: number } | null;
  toolsDrawerOpen: boolean;
  activeStudioTool: StudioToolId;
  timelineZoom: number;
  timelineTrackMuted: Record<string, boolean>;
  /** Display order of track ids (core + extra). */
  timelineTrackOrder: string[];
  /** Optional label overrides for core tracks. */
  timelineTrackLabels: Record<string, string>;
  /** Hidden core tracks (can be restored via Add track). */
  timelineTrackHidden: string[];
  extraTimelineTracks: ExtraTimelineTrack[];
  selectedTimelineClip: TimelineSelectionItem | null;
  selectedTimelineClips: TimelineSelectionItem[];
  timelineClipboard: CanvasElement[] | null;
  canvasElements: CanvasElement[];
  selectedCanvasElementId: string | null;
  canvasTool: CanvasTool;
  /** Omniclip-style media clips (source of truth for video/audio tracks). */
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  /** Imported media library (session-local files). */
  mediaAssets: MediaAsset[];
  projectUndoStack: ProjectSnapshot[];
  projectRedoStack: ProjectSnapshot[];
  previewFullscreenOpen: boolean;
  canvasPreviewAxis: boolean;
  canvasAttachSnap: boolean;
  canvasZoom: number;
  videoSessionId: string | null;
  videoSessionLoading: boolean;
  projectEditor: ProjectEditorState;

  setVideo: (file: File, url: string) => void;
  importMediaFiles: (files: FileList | File[]) => Promise<void>;
  removeMediaAsset: (id: string) => void;
  addMediaAssetToTimeline: (
    assetId: string,
    atTime?: number,
    options?: { trackId?: string },
  ) => void;
  setPrimaryVideoAsset: (assetId: string) => void;
  /** Restore media library from OPFS (survives reload). */
  hydrateMediaLibrary: () => Promise<void>;
  resetProject: () => void;
  setProjectId: (projectId: string | null) => void;
  hydrateProject: (input: {
    id: string;
    title: string;
    aspectRatio: AspectRatioId;
    status: 'done' | 'processing' | 'failed';
    progress?: number;
    durationSec?: number;
    editorState?: {
      videoClips?: MediaClip[];
      audioClips?: MediaClip[];
      canvasElements?: CanvasElement[];
      transcript?: string;
      translatedText?: string;
    };
  }) => void;
  setProjectStatus: (status: 'done' | 'processing' | 'failed' | null, progress?: number) => void;
  setTranscript: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setTargetLang: (lang: string) => void;
  setSelectedVoice: (voice: string) => void;
  setSpeakerVoices: (voices: Record<string, string>) => void;
  updateSpeakerVoice: (speaker: string, voiceId: string) => void;
  setAudioBase64: (audio: string | null) => void;
  setAnalysisAudio: (audio: string | null) => void;
  setReelAudioCache: (cache: Record<number, string>) => void;
  addReelAudioCache: (index: number, audio: string) => void;
  setDetectedLanguage: (lang: string | null) => void;
  setVideoAnalysis: (analysis: VideoAnalysis | null) => void;
  setOriginalVolume: (volume: number) => void;
  setVoiceVolume: (volume: number) => void;
  setIsAudioPlaying: (playing: boolean) => void;
  setIsPlayingAnalysis: (playing: boolean) => void;
  setIsSyncPlaying: (playing: boolean) => void;
  setIsReelMode: (mode: boolean) => void;
  setCurrentReelStep: (step: number) => void;
  setPreviewingSpeaker: (speaker: string | null) => void;
  setCurrentTime: (time: number) => void;
  /** Source media length (video file). Timeline `duration` may be longer. */
  mediaDuration: number;
  isTimelinePlaying: boolean;
  setDuration: (duration: number) => void;
  setMediaDuration: (mediaDuration: number) => void;
  seekTimeline: (time: number) => void;
  setTimelinePlaying: (playing: boolean) => void;
  toggleTimelinePlaying: () => void;
  setStatus: (status: ProcessingStatus) => void;
  setErrorMessage: (message: string) => void;
  setIsExporting: (exporting: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  setActiveTab: (tab: EditorTab) => void;
  setProjectName: (name: string) => void;
  setAspectRatio: (ratio: AspectRatioId) => void;
  setVideoDimensions: (width: number, height: number) => void;
  setCaptionPosition: (position: { x: number; y: number } | null) => void;
  setToolsDrawerOpen: (open: boolean) => void;
  setActiveStudioTool: (tool: StudioToolId) => void;
  toggleToolsDrawer: (tool?: StudioToolId) => void;
  setPreviewFullscreenOpen: (open: boolean) => void;
  togglePreviewFullscreen: () => void;
  toggleCanvasPreviewAxis: () => void;
  toggleCanvasAttachSnap: () => void;
  setCanvasZoom: (zoom: number) => void;
  setVideoSessionId: (sessionId: string | null) => void;
  setVideoSessionLoading: (loading: boolean) => void;
  setVideoFilter: (filterId: string | null) => void;
  setCaptionStylePreset: (style: CaptionStyle) => void;
  applyAudioMixPreset: (presetId: string) => void;
  applyClipTransition: (clipId: string, transitionId: string, edge: 'in' | 'out') => void;
  getVideoCssFilter: () => string;
  setTimelineZoom: (zoom: number) => void;
  toggleTimelineTrackMuted: (trackId: TimelineTrackId) => void;
  /** Replace selection with one clip (or clear). Keeps primary + multi in sync. */
  selectTimelineClip: (
    clip: TimelineSelectionItem | null,
    options?: {
      mode?: TimelineSelectMode;
      syncCanvas?: boolean;
      openInspector?: boolean;
    },
  ) => void;
  /** Replace multi-selection; primary defaults to last item. */
  setTimelineSelection: (
    clips: TimelineSelectionItem[],
    primary?: TimelineSelectionItem | null,
    options?: { syncCanvas?: boolean },
  ) => void;
  clearTimelineSelection: (options?: { clearCanvas?: boolean }) => void;
  /** @deprecated Prefer selectTimelineClip / setTimelineSelection */
  setSelectedTimelineClip: (clip: TimelineSelectionItem | null) => void;
  /** @deprecated Prefer setTimelineSelection */
  setSelectedTimelineClips: (clips: TimelineSelectionItem[]) => void;
  /** @deprecated Prefer selectTimelineClip({ mode: 'add' }) */
  addToTimelineSelection: (clip: TimelineSelectionItem) => void;
  /** @deprecated Prefer selectTimelineClip({ mode: 'toggle' }) */
  removeFromTimelineSelection: (clip: TimelineSelectionItem) => void;
  copyTimelineSelection: () => void;
  cutTimelineSelection: () => void;
  pasteTimelineClipboard: (atTime?: number) => void;
  duplicateTimelineSelection: () => void;
  deleteTimelineSelection: () => void;
  updateSegment: (index: number, newText: string, type: 'transcript' | 'translation') => void;
  updateSegmentTime: (index: number, newTime: number, type: 'transcript' | 'translation') => void;
  updateSegmentDuration: (index: number, duration: number, type: 'transcript' | 'translation') => void;
  removeTimelineClip: (trackId: TimelineTrackId, clipId: string) => void;
  addTimelineClip: (trackId: TimelineTrackId, time: number) => void;
  addTimelineTrack: (type?: ExtraTrackType) => void;
  removeTimelineTrack: (trackId: string) => void;
  reorderTimelineTracks: (fromId: string, toId: string) => void;
  renameTimelineTrack: (trackId: string, label: string) => void;
  moveTimelineClipToTrack: (
    clipId: string,
    fromTrackId: string,
    toTrackId: string,
  ) => void;
  addClipKeyframe: (clipId: string, atTime?: number) => void;
  removeClipKeyframe: (clipId: string, keyframeId: string) => void;
  setCanvasElements: (elements: CanvasElement[]) => void;
  setCanvasTool: (tool: CanvasTool) => void;
  setSelectedCanvasElementId: (id: string | null) => void;
  selectCanvasElement: (id: string | null) => void;
  updateCanvasElement: (
    id: string,
    patch: Partial<CanvasElement>,
    options?: { history?: boolean },
  ) => void;
  updateMediaClip: (
    id: string,
    patch: Partial<MediaClip>,
    options?: { history?: boolean },
  ) => void;
  commitProjectHistory: () => void;
  duplicateCanvasElement: (id: string) => void;
  replaceCanvasElementImage: (id: string, file: File) => void;
  addCanvasLogo: (file: File) => void;
  addCanvasImageOverlay: (file: File, options?: AddCanvasImageOptions) => void;
  addCanvasImageFromUrl: (src: string, options?: AddCanvasImageOptions) => void;
  addTextTemplate: (template: TextTemplateInput, options?: AddTextTemplateOptions) => void;
  removeCanvasElement: (id: string) => void;
  undoCanvas: () => void;
  redoCanvas: () => void;
  splitTimelineAtPlayhead: () => void;
  initSpeakersFromTranscript: (text: string) => void;
}

const initialState = {
  videoFile: null as File | null,
  videoUrl: null as string | null,
  transcript: '',
  translatedText: '',
  targetLang: 'Khmer',
  selectedVoice: DEFAULT_VOICE,
  speakerVoices: {} as Record<string, string>,
  detectedSpeakers: [] as string[],
  audioBase64: null as string | null,
  analysisAudio: null as string | null,
  reelAudioCache: {} as Record<number, string>,
  detectedLanguage: null as string | null,
  videoAnalysis: null as VideoAnalysis | null,
  originalVolume: 0.2,
  voiceVolume: 1.0,
  isAudioPlaying: false,
  isPlayingAnalysis: false,
  isSyncPlaying: false,
  isReelMode: false,
  currentReelStep: 0,
  previewingSpeaker: null as string | null,
  currentTime: 0,
  duration: 0,
  mediaDuration: 0,
  isTimelinePlaying: false,
  status: 'idle' as ProcessingStatus,
  errorMessage: '',
  isExporting: false,
  sidebarOpen: true,
  editorOpen: true,
  activeTab: 'translate' as EditorTab,
  projectId: null as string | null,
  projectName: '',
  projectStatus: null as 'done' | 'processing' | 'failed' | null,
  projectProgress: 0,
  aspectRatio: 'original' as AspectRatioId,
  videoWidth: 0,
  videoHeight: 0,
  captionPosition: null as { x: number; y: number } | null,
  toolsDrawerOpen: true,
  activeStudioTool: 'media' as StudioToolId,
  timelineZoom: 100,
  timelineTrackMuted: {
    video: false,
    text: false,
    image: false,
    sticker: false,
    effect: false,
    sound: false,
    audio: false,
  } as Record<string, boolean>,
  timelineTrackOrder: [] as string[],
  timelineTrackLabels: {} as Record<string, string>,
  timelineTrackHidden: [] as string[],
  extraTimelineTracks: [] as ExtraTimelineTrack[],
  selectedTimelineClip: null as TimelineSelectionItem | null,
  selectedTimelineClips: [] as TimelineSelectionItem[],
  timelineClipboard: null as CanvasElement[] | null,
  canvasElements: [] as CanvasElement[],
  selectedCanvasElementId: null as string | null,
  canvasTool: 'select' as CanvasTool,
  videoClips: [] as MediaClip[],
  audioClips: [] as MediaClip[],
  mediaAssets: [] as MediaAsset[],
  projectUndoStack: [] as ProjectSnapshot[],
  projectRedoStack: [] as ProjectSnapshot[],
  previewFullscreenOpen: false,
  canvasPreviewAxis: true,
  canvasAttachSnap: true,
  canvasZoom: 100,
  videoSessionId: null as string | null,
  videoSessionLoading: false,
  projectEditor: { ...DEFAULT_PROJECT_EDITOR_STATE },
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setVideo: (file, url) => {
    const state = get();
    const prevUrl = state.videoUrl;
    const existingByUrl = state.mediaAssets.find((asset) => asset.url === url);
    const primaryId = existingByUrl?.id ?? `asset-primary-${Date.now()}`;
    storeMediaFile(primaryId, file);

    const otherAssets = state.mediaAssets.filter((asset) => asset.id !== primaryId);
    if (prevUrl && prevUrl !== url) {
      const stillUsed = otherAssets.some((asset) => asset.url === prevUrl);
      if (!stillUsed) URL.revokeObjectURL(prevUrl);
    }

    const primaryAsset: MediaAsset = {
      id: primaryId,
      kind: 'video',
      name: file.name,
      url,
      mimeType: file.type || 'video/mp4',
      size: file.size,
      duration: existingByUrl?.duration || state.mediaDuration || 0,
      width: existingByUrl?.width || state.videoWidth || undefined,
      height: existingByUrl?.height || state.videoHeight || undefined,
      isPrimary: true,
    };

    set({
      videoFile: file,
      videoUrl: url,
      projectName: state.projectName?.trim() ? state.projectName : defaultProjectName(file.name),
      videoWidth: 0,
      videoHeight: 0,
      videoClips: [],
      audioClips: state.audioClips,
      mediaAssets: [
        primaryAsset,
        ...otherAssets.map((asset) => ({ ...asset, isPrimary: false })),
      ],
      transcript: '',
      translatedText: '',
      audioBase64: null,
      detectedSpeakers: [],
      speakerVoices: {},
      detectedLanguage: null,
      videoAnalysis: null,
      analysisAudio: null,
      reelAudioCache: {},
      isAudioPlaying: false,
      isSyncPlaying: false,
      isReelMode: false,
      currentReelStep: 0,
      status: 'idle',
      errorMessage: '',
      captionPosition: null,
      toolsDrawerOpen: true,
      activeStudioTool: 'media',
      selectedTimelineClip: null,
      selectedTimelineClips: [],
      selectedCanvasElementId: null,
      projectUndoStack: [],
      projectRedoStack: [],
      videoSessionId: null,
      videoSessionLoading: false,
      projectEditor: { ...DEFAULT_PROJECT_EDITOR_STATE },
      mediaDuration: primaryAsset.duration,
      isTimelinePlaying: false,
      currentTime: 0,
    });

    void persistMediaToOpfs(primaryAsset, file).catch(() => undefined);
  },

  importMediaFiles: async (files) => {
    const list = Array.from(files);
    for (const file of list) {
      const kind = kindFromFile(file);
      if (!kind) continue;

      const url = URL.createObjectURL(file);
      const meta = await probeMediaMeta(file, url);
      const state = get();

      if (kind === 'video' && !state.videoUrl) {
        get().setVideo(file, url);
        set((s) => ({
          mediaAssets: s.mediaAssets.map((item) =>
            item.isPrimary
              ? { ...item, duration: meta.duration, width: meta.width, height: meta.height }
              : item,
          ),
          mediaDuration: meta.duration,
          duration: computeTimelineDuration(meta.duration, s.videoClips, meta.duration || 30),
        }));
        continue;
      }

      const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      storeMediaFile(id, file);
      const asset: MediaAsset = {
        id,
        kind,
        name: file.name,
        url,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
      };
      set((s) => ({ mediaAssets: [...s.mediaAssets, asset] }));
      void persistMediaToOpfs(asset, file).catch(() => undefined);
    }
  },

  removeMediaAsset: (id) => {
    const state = get();
    const asset = state.mediaAssets.find((item) => item.id === id);
    if (!asset || asset.isPrimary) return;

    const stillUsed =
      state.videoUrl === asset.url ||
      state.canvasElements.some((el) => el.src === asset.url) ||
      state.mediaAssets.some((item) => item.id !== id && item.url === asset.url);
    if (!stillUsed) URL.revokeObjectURL(asset.url);
    forgetMediaFile(id);
    set({ mediaAssets: state.mediaAssets.filter((item) => item.id !== id) });
    void removeMediaFromOpfs(id).catch(() => undefined);
  },

  hydrateMediaLibrary: async () => {
    if (get().mediaAssets.length > 0) return;
    try {
      const assets = await hydrateMediaFromOpfs(storeMediaFile);
      if (!assets.length) return;
      set({ mediaAssets: assets });

      const primary = assets.find((asset) => asset.isPrimary);
      if (primary && !get().videoUrl) {
        const mediaFile = getMediaFile(primary.id);
        if (!mediaFile) return;
        set({
          videoFile: mediaFile,
          videoUrl: primary.url,
          mediaDuration: primary.duration,
          duration: computeTimelineDuration(
            primary.duration,
            get().videoClips,
            primary.duration || 30,
          ),
          videoWidth: primary.width ?? 0,
          videoHeight: primary.height ?? 0,
        });
      }
    } catch {
      // OPFS unavailable (private mode / unsupported) — ignore
    }
  },

  setPrimaryVideoAsset: (assetId) => {
    const state = get();
    const asset = state.mediaAssets.find((item) => item.id === assetId);
    if (!asset || asset.kind !== 'video' || asset.isPrimary) return;
    const file = getMediaFile(assetId);
    if (!file) return;
    get().setVideo(file, asset.url);
  },

  addMediaAssetToTimeline: (assetId, atTime, options) => {
    const state = get();
    const asset = state.mediaAssets.find((item) => item.id === assetId);
    if (!asset) return;
    const time = Math.max(0, atTime ?? state.currentTime);
    const openInspector = true;
    const targetTrack = options?.trackId;

    if (asset.kind === 'image') {
      const tid = targetTrack ? String(targetTrack) : '';
      const trackId =
        tid === 'image' ||
        tid === 'sticker' ||
        tid === 'effect' ||
        tid === 'overlay' ||
        tid.startsWith('image-') ||
        tid.startsWith('sticker-') ||
        tid.startsWith('effect-') ||
        tid.startsWith('overlay-')
          ? tid === 'overlay' || tid.startsWith('overlay-')
            ? 'image'
            : tid
          : 'image';
      get().addCanvasImageFromUrl(asset.url, {
        label: asset.name,
        startTime: time,
        endTime: time + Math.max(1, asset.duration || 4),
        keepStudioTool: true,
        trackId,
      });
      if (openInspector) set({ activeTab: 'inspector', editorOpen: true });
      return;
    }

    if (asset.kind === 'video') {
      if (!asset.isPrimary) get().setPrimaryVideoAsset(assetId);
      const latest = get();
      const clipDuration = Math.max(
        0.4,
        asset.duration || latest.mediaDuration || latest.duration || 1,
      );
      const clip = createMediaClip({
        name: asset.name,
        duration: clipDuration,
        start: time,
        sourceStart: 0,
      });
      set({
        ...pushHistory(latest),
        ...withTimelineDuration(latest, {
          videoClips: [...latest.videoClips, clip],
        }),
        selectedTimelineClip: { trackId: 'video', clipId: clip.id },
        selectedTimelineClips: [{ trackId: 'video', clipId: clip.id }],
        ...(openInspector ? { activeTab: 'inspector' as const, editorOpen: true } : {}),
      });
      return;
    }

    if (asset.kind === 'audio') {
      const clipDuration = Math.max(0.4, asset.duration || 1);
      const clip = createMediaClip({
        name: asset.name,
        duration: clipDuration,
        start: time,
        sourceStart: 0,
      });
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, {
          audioClips: [...state.audioClips, clip],
        }),
        selectedTimelineClip: { trackId: 'audio', clipId: clip.id },
        selectedTimelineClips: [{ trackId: 'audio', clipId: clip.id }],
        ...(openInspector ? { activeTab: 'inspector' as const, editorOpen: true } : {}),
      });
    }
  },

  resetProject: () => {
    const state = get();
    for (const asset of state.mediaAssets) {
      URL.revokeObjectURL(asset.url);
      forgetMediaFile(asset.id);
    }
    const prevUrl = state.videoUrl;
    if (prevUrl && !state.mediaAssets.some((asset) => asset.url === prevUrl)) {
      URL.revokeObjectURL(prevUrl);
    }
    set({ ...initialState });
  },

  setProjectId: (projectId) => set({ projectId }),

  hydrateProject: (input) => {
    const state = get();
    const editor = input.editorState;
    const videoClips = editor?.videoClips ?? state.videoClips;
    const audioClips = editor?.audioClips ?? state.audioClips;
    const fallbackDuration = input.durationSec ?? state.duration ?? 0;
    const duration = computeTimelineDuration(
      state.mediaDuration,
      [...videoClips, ...audioClips],
      fallbackDuration > 0 ? fallbackDuration : 30,
    );
    set({
      projectId: input.id,
      projectName: input.title,
      aspectRatio: input.aspectRatio,
      projectStatus: input.status,
      projectProgress: input.progress ?? (input.status === 'done' ? 100 : 0),
      duration,
      ...(editor?.videoClips ? { videoClips: editor.videoClips } : {}),
      ...(editor?.audioClips ? { audioClips: editor.audioClips } : {}),
      ...(editor?.canvasElements ? { canvasElements: editor.canvasElements } : {}),
      ...(editor?.transcript != null ? { transcript: editor.transcript } : {}),
      ...(editor?.translatedText != null ? { translatedText: editor.translatedText } : {}),
      projectUndoStack: [],
      projectRedoStack: [],
      isTimelinePlaying: false,
    });
  },

  setProjectStatus: (status, progress) =>
    set({
      projectStatus: status,
      projectProgress: progress ?? (status === 'done' ? 100 : get().projectProgress),
    }),

  setTranscript: (text) => set({ transcript: text }),
  setTranslatedText: (text) => set({ translatedText: text }),
  setTargetLang: (lang) => set({ targetLang: lang }),
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),
  setSpeakerVoices: (voices) => set({ speakerVoices: voices }),
  updateSpeakerVoice: (speaker, voiceId) =>
    set((s) => ({ speakerVoices: { ...s.speakerVoices, [speaker]: voiceId } })),
  setAudioBase64: (audio) => {
    const state = get();
    const duration = state.duration || 1;
    const audioClips = audio
      ? state.audioClips.length > 0
        ? state.audioClips
        : [createMediaClip({ name: 'Generated voice', duration, id: 'audio-main' })]
      : [];
    set({
      audioBase64: audio,
      ...withTimelineDuration(state, { audioClips }),
    });
  },
  setAnalysisAudio: (audio) => set({ analysisAudio: audio }),
  setReelAudioCache: (cache) => set({ reelAudioCache: cache }),
  addReelAudioCache: (index, audio) =>
    set((s) => ({ reelAudioCache: { ...s.reelAudioCache, [index]: audio } })),
  setDetectedLanguage: (lang) => set({ detectedLanguage: lang }),
  setVideoAnalysis: (analysis) => set({ videoAnalysis: analysis }),
  setOriginalVolume: (volume) => set({ originalVolume: volume }),
  setVoiceVolume: (volume) => set({ voiceVolume: volume }),
  setIsAudioPlaying: (playing) => set({ isAudioPlaying: playing }),
  setIsPlayingAnalysis: (playing) => set({ isPlayingAnalysis: playing }),
  setIsSyncPlaying: (playing) => set({ isSyncPlaying: playing }),
  setIsReelMode: (mode) => set({ isReelMode: mode }),
  setCurrentReelStep: (step) => set({ currentReelStep: step }),
  setPreviewingSpeaker: (speaker) => set({ previewingSpeaker: speaker }),
  setCurrentTime: (time) => set({ currentTime: time }),

  setMediaDuration: (mediaDuration) => {
    const state = get();
    let videoClips = state.videoClips;
    let audioClips = state.audioClips;
    if (mediaDuration > 0 && state.videoFile && videoClips.length === 0) {
      videoClips = [
        createMediaClip({
          name: state.videoFile.name,
          duration: mediaDuration,
          start: 0,
          sourceStart: 0,
        }),
      ];
    }
    if (mediaDuration > 0 && state.audioBase64 && audioClips.length === 0) {
      audioClips = [
        createMediaClip({
          name: 'Generated voice',
          duration: mediaDuration,
          start: 0,
          sourceStart: 0,
          id: 'audio-main',
        }),
      ];
    }
    set({
      ...withTimelineDuration(state, { mediaDuration, videoClips, audioClips }),
      mediaAssets: state.mediaAssets.map((asset) =>
        asset.isPrimary
          ? {
              ...asset,
              duration: mediaDuration,
              width: state.videoWidth || asset.width,
              height: state.videoHeight || asset.height,
            }
          : asset,
      ),
    });
  },

  setDuration: (duration) => {
    // Back-compat: treat as media duration when loading a video file.
    get().setMediaDuration(duration);
  },

  seekTimeline: (time) => {
    const state = get();
    const max = state.duration > 0 ? state.duration : Number.POSITIVE_INFINITY;
    const next = Math.min(Math.max(0, time), max);
    set({ currentTime: next });
    syncVideoToTimeline(state.videoClips, next, state.isTimelinePlaying);
  },

  setTimelinePlaying: (playing) => {
    const state = get();
    if (playing) {
      const atEnd = state.duration > 0 && state.currentTime >= state.duration - 0.05;
      const time = atEnd ? 0 : state.currentTime;
      set({ isTimelinePlaying: true, currentTime: time });
      syncVideoToTimeline(state.videoClips, time, true);
      // If playhead is in a gap (or no video), the rAF clock still advances.
      const clip = findClipAtTime(state.videoClips, time);
      if (!clip || !state.videoUrl) {
        getTimelineVideo()?.pause();
      }
      return;
    }
    set({ isTimelinePlaying: false });
    getTimelineVideo()?.pause();
  },

  toggleTimelinePlaying: () => {
    get().setTimelinePlaying(!get().isTimelinePlaying);
  },

  commitProjectHistory: () => {
    const state = get();
    set(pushHistory(state));
  },

  updateMediaClip: (id, patch, options) => {
    const state = get();
    const recordHistory = options?.history !== false;
    const inVideo = state.videoClips.some((clip) => clip.id === id);
    const listKey = inVideo ? 'videoClips' : 'audioClips';
    const list = state[listKey];
    if (!list.some((clip) => clip.id === id)) return;

    const nextList = list.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip));
    set({
      ...(recordHistory ? pushHistory(state) : {}),
      ...withTimelineDuration(state, { [listKey]: nextList }),
    });
  },
  setStatus: (status) => set({ status }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setIsExporting: (exporting) => set({ isExporting: exporting }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setEditorOpen: (open) => set({ editorOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setProjectName: (name) => set({ projectName: name.trim() || 'Untitled project' }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setVideoDimensions: (width, height) => {
    const state = get();
    const isFirstDimensions = state.videoWidth === 0 && state.videoHeight === 0;
    const duration = state.duration;
    const canvasElements =
      duration > 0
        ? state.canvasElements.map((el) => {
            if (
              (el.type === 'logo' || el.type === 'image') &&
              el.startTime === 0 &&
              el.endTime > duration
            ) {
              return { ...el, endTime: duration };
            }
            return el;
          })
        : state.canvasElements;

    set({
      videoWidth: width,
      videoHeight: height,
      canvasElements,
      ...(isFirstDimensions && width > 0 && height > 0
        ? { aspectRatio: detectAspectRatioId(width, height) }
        : {}),
    });
  },
  setCaptionPosition: (position) => set({ captionPosition: position }),
  setToolsDrawerOpen: (open) => set({ toolsDrawerOpen: open }),
  setActiveStudioTool: (tool) => set({ activeStudioTool: tool }),
  toggleToolsDrawer: (tool) =>
    set((s) => {
      if (s.toolsDrawerOpen && (!tool || tool === s.activeStudioTool)) {
        return { toolsDrawerOpen: false };
      }
      return { toolsDrawerOpen: true, activeStudioTool: tool ?? s.activeStudioTool };
    }),

  setPreviewFullscreenOpen: (open) => set({ previewFullscreenOpen: open }),
  togglePreviewFullscreen: () => set((s) => ({ previewFullscreenOpen: !s.previewFullscreenOpen })),
  toggleCanvasPreviewAxis: () => set((s) => ({ canvasPreviewAxis: !s.canvasPreviewAxis })),
  toggleCanvasAttachSnap: () => set((s) => ({ canvasAttachSnap: !s.canvasAttachSnap })),
  setCanvasZoom: (zoom) => set({ canvasZoom: Math.min(200, Math.max(25, zoom)) }),
  setVideoSessionId: (sessionId) => set({ videoSessionId: sessionId }),
  setVideoSessionLoading: (loading) => set({ videoSessionLoading: loading }),

  setVideoFilter: (filterId) =>
    set((s) => ({
      projectEditor: { ...s.projectEditor, videoFilterId: filterId },
    })),

  setCaptionStylePreset: (style) =>
    set((s) => ({
      projectEditor: { ...s.projectEditor, captionStyle: style },
    })),

  applyAudioMixPreset: (presetId) => {
    const preset = findEditorPreset('audio', presetId);
    const meta = preset?.meta as { original?: number; voice?: number } | undefined;
    if (!meta) return;
    set({
      originalVolume: meta.original ?? 0.2,
      voiceVolume: meta.voice ?? 1,
    });
  },

  applyClipTransition: (clipId, transitionId, edge) =>
    set((s) => {
      const clipEdits = { ...s.projectEditor.clipEdits };
      const current = clipEdits[clipId] ?? {};
      clipEdits[clipId] = {
        ...current,
        ...(edge === 'in' ? { transitionInId: transitionId } : { transitionOutId: transitionId }),
      };
      return { projectEditor: { ...s.projectEditor, clipEdits } };
    }),

  getVideoCssFilter: () => getFilterCss(get().projectEditor.videoFilterId),

  setTimelineZoom: (zoom) => set({ timelineZoom: Math.min(400, Math.max(25, zoom)) }),
  toggleTimelineTrackMuted: (trackId) =>
    set((s) => ({
      timelineTrackMuted: { ...s.timelineTrackMuted, [trackId]: !s.timelineTrackMuted[trackId] },
    })),
  selectTimelineClip: (clip, options = {}) => {
    const { mode = 'replace', syncCanvas = true, openInspector = false } = options;
    const state = get();
    let selection = buildTimelineSelection([]);

    if (clip) {
      const current = resolveTimelineSelectionItems(
        state.selectedTimelineClip,
        state.selectedTimelineClips,
      );
      if (mode === 'replace') {
        selection = buildTimelineSelection([clip], clip);
      } else if (mode === 'add') {
        selection = buildTimelineSelection([...current, clip], clip);
      } else {
        selection = toggleTimelineSelectionItem(current, clip, state.selectedTimelineClip);
      }
    }

    const patch: Partial<AppState> = selectionWithCanvasSync(state, selection, syncCanvas);
    const stillSelected =
      clip &&
      selection.selectedTimelineClips.some(
        (c) => c.trackId === clip.trackId && c.clipId === clip.clipId,
      );
    if (openInspector && stillSelected) {
      patch.activeTab = 'inspector';
      patch.editorOpen = true;
    }
    set(patch);
    // Pause playback when focusing a canvas or video clip so Konva handles stay interactive.
    if (
      stillSelected &&
      state.isTimelinePlaying &&
      (patch.selectedCanvasElementId || clip?.trackId === 'video')
    ) {
      get().setTimelinePlaying(false);
    }
  },

  setTimelineSelection: (clips, primary, options = {}) => {
    const { syncCanvas = true } = options;
    const state = get();
    const selection = buildTimelineSelection(clips, primary);
    set(selectionWithCanvasSync(state, selection, syncCanvas));
  },

  clearTimelineSelection: (options = {}) => {
    const { clearCanvas = true } = options;
    set({
      selectedTimelineClip: null,
      selectedTimelineClips: [],
      ...(clearCanvas ? { selectedCanvasElementId: null } : {}),
    });
  },

  setSelectedTimelineClip: (clip) => {
    get().selectTimelineClip(clip, { mode: 'replace', syncCanvas: true });
  },
  setSelectedTimelineClips: (clips) => {
    get().setTimelineSelection(clips);
  },
  addToTimelineSelection: (clip) => {
    get().selectTimelineClip(clip, { mode: 'add', syncCanvas: true });
  },
  removeFromTimelineSelection: (clip) => {
    get().selectTimelineClip(clip, { mode: 'toggle', syncCanvas: true });
  },

  copyTimelineSelection: () => {
    const { selectedTimelineClips, selectedTimelineClip, canvasElements } = get();
    const keys = resolveTimelineSelectionItems(selectedTimelineClip, selectedTimelineClips);
    if (!keys.length) return;
    const ids = new Set(keys.map((k) => k.clipId));
    const copied = canvasElements
      .filter((el) => ids.has(el.id))
      .map((el) => ({ ...el }));
    if (copied.length) set({ timelineClipboard: copied });
  },
  cutTimelineSelection: () => {
    get().copyTimelineSelection();
    get().deleteTimelineSelection();
  },
  pasteTimelineClipboard: (atTime?: number) => {
    const { timelineClipboard, currentTime, canvasElements, duration } = get();
    if (!timelineClipboard || !timelineClipboard.length) return;
    const pasteAt = atTime ?? currentTime;
    const offset = pasteAt - (timelineClipboard[0].startTime ?? 0);
    const newElements = timelineClipboard.map((el) => {
      const id = `template-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newStart = Math.max(0, (el.startTime ?? 0) + offset);
      const newEnd = Math.min(duration || 3600, (el.endTime ?? 2) + offset);
      return { ...el, id, startTime: newStart, endTime: newEnd };
    });
    const state = get();
    const items: TimelineSelectionItem[] = newElements.map((el) => ({
      trackId: (el.trackId ?? 'text') as TimelineTrackId,
      clipId: el.id,
    }));
    const selection = buildTimelineSelection(items, items[0] ?? null);
    set({
      ...pushHistory(state),
      canvasElements: [...canvasElements, ...newElements],
      ...selectionWithCanvasSync(
        { ...state, canvasElements: [...canvasElements, ...newElements] },
        selection,
        true,
      ),
    });
  },
  duplicateTimelineSelection: () => {
    const { selectedTimelineClips, selectedTimelineClip, canvasElements, duration } = get();
    const keys = resolveTimelineSelectionItems(selectedTimelineClip, selectedTimelineClips);
    if (!keys.length) return;
    const ids = new Set(keys.map((k) => k.clipId));
    const state = get();
    const duped = canvasElements
      .filter((el) => ids.has(el.id))
      .map((el) => {
        const id = `template-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const dur = (el.endTime ?? 2) - (el.startTime ?? 0);
        const newStart = Math.min(
          (el.endTime ?? 2),
          (duration || 3600) - dur,
        );
        return { ...el, id, startTime: newStart, endTime: newStart + dur };
      });
    if (!duped.length) return;
    const items: TimelineSelectionItem[] = duped.map((el) => ({
      trackId: (el.trackId ?? 'text') as TimelineTrackId,
      clipId: el.id,
    }));
    const selection = buildTimelineSelection(items, items[0] ?? null);
    set({
      ...pushHistory(state),
      canvasElements: [...canvasElements, ...duped],
      ...selectionWithCanvasSync(
        { ...state, canvasElements: [...canvasElements, ...duped] },
        selection,
        true,
      ),
    });
  },
  deleteTimelineSelection: () => {
    const { selectedTimelineClips, selectedTimelineClip } = get();
    const keys = resolveTimelineSelectionItems(selectedTimelineClip, selectedTimelineClips);
    if (!keys.length) return;
    for (const { trackId, clipId } of keys) {
      get().removeTimelineClip(trackId, clipId);
    }
    get().clearTimelineSelection({ clearCanvas: true });
  },

  updateSegment: (index, newText, type) => {
    const state = get();
    if (type === 'transcript') {
      const segments = parseSegments(state.transcript);
      set({ transcript: updateSegmentText(segments, index, newText) });
    } else {
      const segments = parseSegments(state.translatedText);
      set({ translatedText: updateSegmentText(segments, index, newText) });
    }
  },

  updateSegmentTime: (index, newTime, type) => {
    const state = get();
    const maxTime = state.duration || Infinity;
    if (type === 'transcript') {
      const segments = parseSegments(state.transcript);
      set({ transcript: updateSegmentTime(segments, index, newTime, maxTime) });
    } else {
      const segments = parseSegments(state.translatedText);
      set({ translatedText: updateSegmentTime(segments, index, newTime, maxTime) });
    }
  },

  updateSegmentDuration: (index, duration, type) => {
    const state = get();
    const maxTime = state.duration || Infinity;
    if (type === 'transcript') {
      const segments = parseSegments(state.transcript);
      set({ transcript: updateSegmentDuration(segments, index, duration, maxTime) });
    } else {
      const segments = parseSegments(state.translatedText);
      set({ translatedText: updateSegmentDuration(segments, index, duration, maxTime) });
    }
  },

  removeTimelineClip: (trackId, clipId) => {
    const state = get();
    const selectionPatch = selectionAfterRemovingClip(state, clipId);

    if (trackId === 'video') {
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, {
          videoClips: state.videoClips.filter((clip) => clip.id !== clipId),
        }),
        ...selectionPatch,
      });
      return;
    }

    if (trackId === 'audio') {
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, {
          audioClips: state.audioClips.filter((clip) => clip.id !== clipId),
        }),
        ...selectionPatch,
      });
      return;
    }

    if (clipId.startsWith('logo-') || clipId.startsWith('image-') || clipId.startsWith('template-') || clipId.startsWith('overlay-text-')) {
      get().removeCanvasElement(clipId);
      return;
    }

    // Canvas elements with arbitrary ids (e.g. split clones).
    if (state.canvasElements.some((el) => el.id === clipId)) {
      get().removeCanvasElement(clipId);
      return;
    }

    const meta = clipId.match(/^(translation|transcript)-(\d+)$/);
    if (!meta) return;
    const type = meta[1] as 'translation' | 'transcript';
    const index = parseInt(meta[2], 10);
    if (type === 'transcript') {
      const segments = parseSegments(state.transcript);
      set({
        ...pushHistory(state),
        transcript: removeSegment(segments, index),
        ...selectionPatch,
      });
    } else {
      const segments = parseSegments(state.translatedText);
      set({
        ...pushHistory(state),
        translatedText: removeSegment(segments, index),
        ...selectionPatch,
      });
    }
  },

  addTimelineClip: (trackId, time) => {
    const state = get();
    const idStr = String(trackId);

    if (trackId === 'text') {
      const segments = parseSegments(state.translatedText);
      set({
        translatedText: addSegmentAtTime(segments, time, 'Speaker', 'New caption'),
        ...buildTimelineSelection([]),
        selectedCanvasElementId: null,
      });
      return;
    }

    if (idStr.startsWith('text-')) {
      const duration = state.duration || 3600;
      const id = `template-${Date.now()}`;
      const element: CanvasElement = {
        id,
        type: 'text',
        text: 'New text',
        x: 40,
        y: 40,
        width: 220,
        height: 32,
        fontSize: 20,
        rotation: 0,
        opacity: 1,
        startTime: time,
        endTime: Math.min(duration, time + 4),
        trackId: idStr,
      };
      const item: TimelineSelectionItem = { trackId, clipId: id };
      set({
        ...pushHistory(state),
        canvasElements: [...state.canvasElements, element],
        selectedCanvasElementId: id,
        ...buildTimelineSelection([item], item),
        canvasTool: 'select',
        activeStudioTool: 'text',
        toolsDrawerOpen: true,
      });
      return;
    }

    // Visual tracks — open the matching studio tool to pick footage/elements
    if (
      idStr === 'image' ||
      idStr === 'sticker' ||
      idStr === 'effect' ||
      idStr === 'overlay' ||
      idStr.startsWith('image-') ||
      idStr.startsWith('sticker-') ||
      idStr.startsWith('effect-') ||
      idStr.startsWith('overlay-')
    ) {
      const tool =
        idStr === 'sticker' || idStr.startsWith('sticker-') || idStr === 'effect' || idStr.startsWith('effect-')
          ? 'effects'
          : 'media';
      set({
        activeStudioTool: tool,
        toolsDrawerOpen: true,
      });
    }
  },

  addTimelineTrack: (type: ExtraTrackType = 'image') => {
    const state = get();
    // Restore a hidden core track of this type when possible.
    const coreId = (DEFAULT_TIMELINE_TRACK_ORDER as string[]).find(
      (id) => id === type && state.timelineTrackHidden.includes(id),
    );
    if (coreId) {
      const order =
        state.timelineTrackOrder.length > 0
          ? state.timelineTrackOrder
          : [...DEFAULT_TIMELINE_TRACK_ORDER];
      set({
        ...pushHistory(state),
        timelineTrackHidden: state.timelineTrackHidden.filter((id) => id !== coreId),
        timelineTrackOrder: order.includes(coreId) ? order : [...order, coreId],
        timelineTrackMuted: { ...state.timelineTrackMuted, [coreId]: false },
      });
      return;
    }

    const sameType = state.extraTimelineTracks.filter((t) => t.type === type).length;
    const track: ExtraTimelineTrack = {
      id: `${type}-${Date.now()}`,
      type,
      label: `${TRACK_TYPE_LABELS[type]} ${sameType + 2}`,
    };
    const order =
      state.timelineTrackOrder.length > 0
        ? state.timelineTrackOrder
        : [...DEFAULT_TIMELINE_TRACK_ORDER];
    set({
      ...pushHistory(state),
      extraTimelineTracks: [...state.extraTimelineTracks, track],
      timelineTrackOrder: [...order, track.id],
      timelineTrackMuted: { ...state.timelineTrackMuted, [track.id]: false },
    });
  },

  removeTimelineTrack: (trackId) => {
    if (!isDeletableTimelineTrack(trackId)) return;
    const state = get();
    const muted = { ...state.timelineTrackMuted };
    delete muted[trackId];
    const labels = { ...state.timelineTrackLabels };
    delete labels[trackId];

    const selection = pruneTimelineSelection(
      state.selectedTimelineClip,
      state.selectedTimelineClips,
      (c) => c.trackId === trackId,
    );

    if (isCoreTimelineTrack(trackId)) {
      set({
        ...pushHistory(state),
        timelineTrackHidden: state.timelineTrackHidden.includes(trackId)
          ? state.timelineTrackHidden
          : [...state.timelineTrackHidden, trackId],
        timelineTrackOrder: state.timelineTrackOrder.filter((id) => id !== trackId),
        timelineTrackLabels: labels,
        timelineTrackMuted: muted,
        ...selectionWithCanvasSync(state, selection, true),
      });
      return;
    }

    const nextCanvas = state.canvasElements.filter((el) => el.trackId !== trackId);
    set({
      ...pushHistory(state),
      extraTimelineTracks: state.extraTimelineTracks.filter((t) => t.id !== trackId),
      timelineTrackOrder: state.timelineTrackOrder.filter((id) => id !== trackId),
      timelineTrackLabels: labels,
      timelineTrackMuted: muted,
      canvasElements: nextCanvas,
      ...selectionWithCanvasSync({ ...state, canvasElements: nextCanvas }, selection, true),
    });
  },

  moveTimelineClipToTrack: (clipId, fromTrackId, toTrackId) => {
    if (fromTrackId === toTrackId) return;
    const state = get();
    const toType = trackTypeFromId(toTrackId, 'image');
    const fromType = trackTypeFromId(fromTrackId, 'image');

    // Canvas-backed clips (image/sticker/text/effect)
    const element = state.canvasElements.find((el) => el.id === clipId);
    if (element) {
      const canMove =
        (element.type === 'text' && isTextTimelineTrack(toTrackId)) ||
        ((element.type === 'image' || element.type === 'logo') &&
          isVisualTimelineTrack(toTrackId));
      if (!canMove) return;
      const nextTrackId =
        toTrackId === 'text' || toTrackId === 'image' || toTrackId === 'sticker'
          ? toTrackId === 'text'
            ? element.type === 'text'
              ? undefined
              : toTrackId
            : toTrackId
          : toTrackId;
      const item: TimelineSelectionItem = {
        trackId: toTrackId as TimelineTrackId,
        clipId,
      };
      set({
        ...pushHistory(state),
        canvasElements: state.canvasElements.map((el) =>
          el.id === clipId ? { ...el, trackId: nextTrackId } : el,
        ),
        ...buildTimelineSelection([item], item),
      });
      return;
    }

    // Media clips: video stays on video; audio can move between audio/sound
    if (fromType === 'video' || toType === 'video') return;
    if (
      (fromType === 'audio' || fromType === 'sound') &&
      (toType === 'audio' || toType === 'sound')
    ) {
      const item: TimelineSelectionItem = {
        trackId: toTrackId as TimelineTrackId,
        clipId,
      };
      set(buildTimelineSelection([item], item));
    }
  },

  addClipKeyframe: (clipId, atTime) => {
    const state = get();
    const element = state.canvasElements.find((el) => el.id === clipId);
    if (!element) return;
    const time = atTime ?? state.currentTime;
    const offset = Math.max(0, time - element.startTime);
    const kf = createKeyframeAtOffset(element, offset);
    const existing = element.keyframes ?? [];
    const near = existing.find((k) => Math.abs(k.offset - kf.offset) < 0.02);
    const keyframes = (
      near
        ? existing.map((k) => (k.id === near.id ? { ...kf, id: near.id } : k))
        : [...existing, kf]
    ).sort((a, b) => a.offset - b.offset);
    set({
      ...pushHistory(state),
      canvasElements: state.canvasElements.map((el) =>
        el.id === clipId ? { ...el, keyframes } : el,
      ),
    });
  },

  removeClipKeyframe: (clipId, keyframeId) => {
    const state = get();
    set({
      ...pushHistory(state),
      canvasElements: state.canvasElements.map((el) =>
        el.id === clipId
          ? { ...el, keyframes: (el.keyframes ?? []).filter((k) => k.id !== keyframeId) }
          : el,
      ),
    });
  },

  reorderTimelineTracks: (fromId, toId) => {
    if (fromId === toId) return;
    const state = get();
    const knownIds = [
      ...DEFAULT_TIMELINE_TRACK_ORDER,
      ...state.extraTimelineTracks.map((t) => t.id),
    ];
    set({
      timelineTrackOrder: moveTrackInOrder(
        state.timelineTrackOrder,
        knownIds,
        fromId,
        toId,
      ),
    });
  },

  renameTimelineTrack: (trackId, label) => {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    const state = get();
    if (isCoreTimelineTrack(trackId)) {
      set({
        ...pushHistory(state),
        timelineTrackLabels: { ...state.timelineTrackLabels, [trackId]: nextLabel },
      });
      return;
    }
    set({
      ...pushHistory(state),
      extraTimelineTracks: state.extraTimelineTracks.map((t) =>
        t.id === trackId ? { ...t, label: nextLabel } : t,
      ),
    });
  },

  setCanvasElements: (elements) => set({ canvasElements: elements }),
  setCanvasTool: (tool) => set({ canvasTool: tool }),
  setSelectedCanvasElementId: (id) => set({ selectedCanvasElementId: id }),
  selectCanvasElement: (id) => {
    if (!id) {
      set({ selectedCanvasElementId: null });
      return;
    }

    const element = get().canvasElements.find((el) => el.id === id);
    // Non-canvas ids (video/audio/segment clips) must not wipe timeline selection.
    if (!element) {
      set({ selectedCanvasElementId: null });
      return;
    }

    const tool: StudioToolId =
      element.type === 'logo' || element.type === 'image' ? 'media' : 'text';

    let item: TimelineSelectionItem;
    if (element.segmentType === 'translation' || element.templateId) {
      item = { trackId: 'text', clipId: element.id };
    } else if (element.segmentType === 'transcript') {
      item = { trackId: 'overlay', clipId: element.id };
    } else if (element.type === 'logo' || element.type === 'image' || element.trackId) {
      item = {
        trackId: (element.trackId ?? 'overlay') as TimelineTrackId,
        clipId: element.id,
      };
    } else {
      item = { trackId: 'text', clipId: element.id };
    }

    set({
      selectedCanvasElementId: id,
      ...buildTimelineSelection([item], item),
      canvasTool: 'select',
      activeStudioTool: tool,
      activeTab: 'inspector' as EditorTab,
      editorOpen: true,
    });
  },
  updateCanvasElement: (id, patch, options) => {
    const state = get();
    const element = state.canvasElements.find((el) => el.id === id);
    if (!element) return;
    const recordHistory = options?.history !== false;

    const nextElements = state.canvasElements.map((el) => (el.id === id ? { ...el, ...patch } : el));
    const updates: Partial<AppState> = {
      canvasElements: nextElements,
      ...(recordHistory ? pushHistory(state) : {}),
    };

    if (
      patch.text !== undefined &&
      element.segmentType !== undefined &&
      element.segmentIndex !== undefined
    ) {
      if (element.segmentType === 'transcript') {
        const segments = parseSegments(state.transcript);
        updates.transcript = updateSegmentText(segments, element.segmentIndex, patch.text);
      } else {
        const segments = parseSegments(state.translatedText);
        updates.translatedText = updateSegmentText(segments, element.segmentIndex, patch.text);
      }
    }

    set(updates);
  },

  duplicateCanvasElement: (id) => {
    const state = get();
    const element = state.canvasElements.find((el) => el.id === id);
    if (!element) return;
    const newId = `${element.type}-${Date.now()}`;
    const dup: CanvasElement = {
      ...element,
      id: newId,
      x: element.x + 20,
      y: element.y + 20,
    };
    set({
      ...pushHistory(state),
      canvasElements: [...state.canvasElements, dup],
      selectedCanvasElementId: newId,
      canvasTool: 'select',
    });
  },

  replaceCanvasElementImage: (id, file) => {
    const state = get();
    const element = state.canvasElements.find((el) => el.id === id);
    if (!element || (element.type !== 'image' && element.type !== 'logo')) return;

    if (element.src?.startsWith('blob:')) {
      URL.revokeObjectURL(element.src);
    }

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const maxDim = 160;
      const scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight, 1);
      get().updateCanvasElement(id, {
        src: url,
        text: file.name,
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale),
      });
    };
    img.onerror = () => {
      get().updateCanvasElement(id, { src: url, text: file.name });
    };
    img.src = url;
  },

  addCanvasLogo: (file) => {
    const state = get();
    const url = URL.createObjectURL(file);
    const id = `logo-${Date.now()}`;
    const duration = state.duration || 3600;
    const element: CanvasElement = {
      id,
      type: 'logo',
      text: file.name,
      src: url,
      x: 24,
      y: 24,
      width: 120,
      height: 48,
      fontSize: 0,
      rotation: 0,
      opacity: 1,
      startTime: 0,
      endTime: duration,
    };
    set({
      ...pushHistory(state),
      canvasElements: [...state.canvasElements, element],
      selectedCanvasElementId: id,
      activeStudioTool: 'media',
      toolsDrawerOpen: true,
    });
  },

  addCanvasImageOverlay: (file, options) => {
    const state = get();
    const url = URL.createObjectURL(file);
    const element = buildCanvasImageElement(state, url, options?.label ?? file.name, options);
    set({
      ...pushHistory(state),
      canvasElements: [...state.canvasElements, element],
      selectedCanvasElementId: element.id,
      activeStudioTool: options?.keepStudioTool ? state.activeStudioTool : 'media',
      toolsDrawerOpen: true,
    });
  },

  addCanvasImageFromUrl: (src, options) => {
    const state = get();
    const element = buildCanvasImageElement(state, src, options?.label ?? 'Sticker', options);
    set({
      ...pushHistory(state),
      canvasElements: [...state.canvasElements, element],
      selectedCanvasElementId: element.id,
      activeStudioTool: options?.keepStudioTool ? state.activeStudioTool : 'effects',
      toolsDrawerOpen: true,
    });
  },

  addTextTemplate: (template, options) => {
    const state = get();
    const time = Math.max(0, options?.startTime ?? state.currentTime);
    const duration = state.duration || 3600;
    const clipDuration = template.duration ?? 4;
    const endTime = Math.min(duration, time + clipDuration);
    const canvasSize = {
      width: options?.canvasWidth ?? estimateCanvasSize(state.videoWidth, state.videoHeight).width,
      height: options?.canvasHeight ?? estimateCanvasSize(state.videoWidth, state.videoHeight).height,
    };
    const placement = computeTemplatePlacement(
      template.verticalAlign,
      template.style.fontSize,
      canvasSize,
    );
    const id = `template-${Date.now()}`;
    const displayText =
      template.style.textTransform === 'uppercase'
        ? template.defaultText.toUpperCase()
        : template.defaultText;

    const x = options?.x ?? placement.x;
    const y = options?.y ?? placement.y;
    const trackId =
      options?.trackId &&
      (options.trackId === 'text' || String(options.trackId).startsWith('text-'))
        ? options.trackId
        : 'text';

    const element: CanvasElement = {
      id,
      type: 'text',
      text: displayText,
      templateId: template.id,
      textStyle: { ...template.style },
      fontFamily: template.fontFamily,
      textEffect: template.textEffect,
      x,
      y,
      width: placement.width,
      height: placement.height,
      fontSize: template.style.fontSize,
      rotation: 0,
      opacity: 1,
      startTime: time,
      endTime: Math.max(time + 0.4, endTime),
      trackId: trackId === 'text' ? undefined : trackId,
    };

    const item: TimelineSelectionItem = {
      trackId: trackId as TimelineTrackId,
      clipId: id,
    };
    set({
      ...pushHistory(state),
      canvasElements: [...state.canvasElements, element],
      selectedCanvasElementId: id,
      ...buildTimelineSelection([item], item),
      activeStudioTool: 'text',
      toolsDrawerOpen: true,
      canvasTool: 'select',
      editorOpen: true,
      activeTab: 'inspector',
    });
  },

  removeCanvasElement: (id) => {
    const state = get();
    const element = state.canvasElements.find((el) => el.id === id);
    if (element?.src?.startsWith('blob:')) URL.revokeObjectURL(element.src);
    const selectionPatch = selectionAfterRemovingClip(state, id);
    set({
      ...pushHistory(state),
      canvasElements: state.canvasElements.filter((el) => el.id !== id),
      ...selectionPatch,
    });
  },

  undoCanvas: () => {
    const state = get();
    if (state.projectUndoStack.length === 0) return;
    const previous = state.projectUndoStack[state.projectUndoStack.length - 1];
    const snapshot = applySnapshot(cloneProjectSnapshot(previous));
    set({
      projectUndoStack: state.projectUndoStack.slice(0, -1),
      projectRedoStack: pushProjectHistory(state.projectRedoStack, snapshotFromState(state)),
      ...snapshot,
      ...withTimelineDuration(state, {
        videoClips: snapshot.videoClips,
        audioClips: snapshot.audioClips,
      }),
    });
  },

  redoCanvas: () => {
    const state = get();
    if (state.projectRedoStack.length === 0) return;
    const next = state.projectRedoStack[state.projectRedoStack.length - 1];
    const snapshot = applySnapshot(cloneProjectSnapshot(next));
    set({
      projectRedoStack: state.projectRedoStack.slice(0, -1),
      projectUndoStack: pushProjectHistory(state.projectUndoStack, snapshotFromState(state)),
      ...snapshot,
      ...withTimelineDuration(state, {
        videoClips: snapshot.videoClips,
        audioClips: snapshot.audioClips,
      }),
    });
  },

  splitTimelineAtPlayhead: () => {
    const state = get();
    const { currentTime, duration, selectedTimelineClip } = state;
    if (!duration || !isTranscriptReady(state.transcript, state.status)) return;

    const trackId = selectedTimelineClip?.trackId ?? 'text';
    const clipId = selectedTimelineClip?.clipId;

    // Omniclip-style: split video/audio media clips.
    if (trackId === 'video' || trackId === 'audio') {
      const listKey = trackId === 'video' ? 'videoClips' : 'audioClips';
      const clips = state[listKey];
      const clip =
        (clipId ? clips.find((item) => item.id === clipId) : null) ??
        clips.find(
          (item) => currentTime > item.start + 0.4 && currentTime < item.start + item.duration - 0.4,
        );
      if (!clip) return;
      const parts = splitMediaClipAt(clip, currentTime);
      if (!parts) return;
      const [left, right] = parts;
      const nextList = clips.flatMap((item) => (item.id === clip.id ? [left, right] : [item]));
      const item: TimelineSelectionItem = { trackId, clipId: right.id };
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, { [listKey]: nextList }),
        ...buildTimelineSelection([item], item),
      });
      return;
    }

    // Split canvas overlays / templates.
    if (clipId) {
      const element = state.canvasElements.find((el) => el.id === clipId);
      if (element) {
        const start = element.startTime;
        const end = element.endTime;
        if (currentTime <= start + 0.4 || currentTime >= end - 0.4) return;
        const left = { ...element, endTime: currentTime };
        const right = {
          ...element,
          id: `${element.type}-${Date.now()}`,
          startTime: currentTime,
        };
        const item: TimelineSelectionItem = { trackId, clipId: right.id };
        set({
          ...pushHistory(state),
          canvasElements: state.canvasElements.flatMap((el) =>
            el.id === element.id ? [left, right] : [el],
          ),
          ...buildTimelineSelection([item], item),
          selectedCanvasElementId: right.id,
        });
        return;
      }
    }

    // Caption segments (transcript / translation).
    const type =
      trackId === 'overlay' ? ('transcript' as const) : ('translation' as const);
    const source = type === 'transcript' ? state.transcript : state.translatedText;
    const segments = parseSegments(source);
    const index =
      selectedTimelineClip && trackId === (type === 'translation' ? 'text' : 'overlay')
        ? parseInt(selectedTimelineClip.clipId.split('-')[1] ?? '-1', 10)
        : getSegmentIndexAtTime(segments, currentTime, duration);

    if (index < 0) return;
    const segStart = segments[index].time;
    const segEnd =
      index < segments.length - 1 ? segments[index + 1].time : duration;
    if (currentTime <= segStart + 0.4 || currentTime >= segEnd - 0.4) return;

    const next = splitSegmentAtTime(segments, currentTime, duration);
    if (!next) return;

    set({
      ...pushHistory(state),
      ...(type === 'transcript' ? { transcript: next } : { translatedText: next }),
    });
  },

  initSpeakersFromTranscript: (text) => {
    const speakers = extractSpeakers(text);
    const initialVoices: Record<string, string> = {};
    speakers.forEach((s, i) => {
      initialVoices[s] = VOICES[i % VOICES.length].id;
    });
    set({ detectedSpeakers: speakers, speakerVoices: initialVoices });
  },
}));
