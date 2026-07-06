import { create } from 'zustand';
import type { EditorTab, ProcessingStatus, VideoAnalysis, AspectRatioId, StudioToolId } from '@/types';
import type { CaptionStyle } from '@/features/studio/lib/exportSettings';
import {
  DEFAULT_PROJECT_EDITOR_STATE,
  DEFAULT_COMPOSITION_BACKGROUND,
  findEditorPreset,
  getFilterCss,
  applyStudioTemplate as instantiateStudioTemplate,
  getStudioTemplate,
  captionSegmentsToTranscript,
  updateCaptionSegmentText,
  updateCaptionWordTiming,
  getTransitionDefaultDurationSec,
  type AutoCutDensity,
  type AutoCutSuggestion,
  type BeatAnalysis,
  type CaptionSegment,
  type CaptionTracks,
  type ProjectEditorState,
  type StudioTemplateAssetBinding,
  type TimelineTransition,
  type CompositionBackground,
} from '@vokop/shared';
import {
  findAdjacentPairForClip,
  upsertTimelineTransition,
} from '@/features/studio/lib/timelineTransitions';
import { DEFAULT_VOICE, VOICES } from '@/features/translation/constants/voices';
import { extractSpeakers } from '@/lib/utils/transcript';
import { updateSegmentText, parseSegments, updateSegmentTime, updateSegmentDuration, removeSegment, addSegmentAtTime } from '@/lib/utils/transcript';
import type {
  ExtraTimelineTrack,
  ExtraTrackType,
  MediaClip,
  TimelineSelectionItem,
  TimelineTrackId,
  TimelineTrackType,
} from '@/features/studio/lib/timelineTypes';
import {
  DEFAULT_TIMELINE_TRACK_ORDER,
  DEFAULT_HIDDEN_CORE_TRACKS,
  isCoreTimelineTrack,
  isDeletableTimelineTrack,
  TRACK_TYPE_LABELS,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
} from '@/features/studio/lib/timelineTypes';
import {
  coreTrackIdForMediaKind,
  isAudioLikeTimelineTrack,
  isTextTimelineTrack,
  isVideoTimelineTrack,
  isVisualTimelineTrack,
  moveTrackInOrder,
  pruneEmptyExtraFootageTracks,
  trackTypeFromId,
} from '@/features/studio/lib/timelineTrackUtils';
import {
  canvasTrackIdFromResolved,
  clipTrackId,
  extraTrackTypeForPlacement,
  insertTrackBelowOrder,
  pickTimelineTrackForPlacement,
  type TimelinePlacementInput,
} from '@/features/studio/lib/timelineTrackPlacement';
import {
  buildTimelineSelection,
  pruneTimelineSelection,
  resolveTimelineSelectionItems,
  toggleTimelineSelectionItem,
  collectAllTimelineSelectionItems,
  type TimelineSelectMode,
} from '@/features/studio/lib/timelineSelection';
import { buildTimelineTracks } from '@/features/studio/lib/buildTimelineTracks';
import { createKeyframeAtOffset } from '@/features/studio/lib/keyframeUtils';
import {
  applyCanvasElementPatch,
  applyMediaClipToLists,
  applySplitAtPlayhead,
  applyMediaSplitsAtTimes,
  timelineItemForCanvasElement,
} from '@/features/studio/services/studioEdit';
import type { CanvasElement, CanvasTool } from '@/types/canvas';
import { defaultProjectName, detectAspectRatioId } from '@/features/studio/constants/aspectRatios';
import {
  computeTimelineDuration,
  createMediaClip,
  extractAudioClipFromVideo,
  findClipAtTime,
  findVideoClipForPreview,
  listVideoTrackIds,
  timelineToSourceTime,
  timelineToVideoSourceTime,
} from '@/features/studio/lib/mediaClips';
import { getTimelineVideo } from '@/features/studio/lib/timelinePlaybackBridge';
import {
  forgetMediaFile,
  getMediaFile,
  kindFromFile,
  probeMediaMeta,
  storeMediaFile,
  type MediaAsset,
  type PersistedMediaAsset,
  mergePersistedMediaAssets,
} from '@/features/studio/lib/mediaLibrary';
import {
  hydrateMediaFromOpfs,
  persistMediaToOpfs,
  removeMediaFromOpfs,
} from '@/features/studio/lib/opfsMediaCache';
import {
  cloneProjectSnapshot,
  pushProjectHistory,
  type ProjectSnapshot,
} from '@/features/studio/lib/projectHistory';
import type { TextTemplateInput, AddTextTemplateOptions } from '@/features/studio/constants/textTemplates';
import { computeTemplatePlacement, estimateCanvasSize } from '@/features/studio/lib/textTemplatePlacement';
import { toFractionBox, toFractionFontSize, toFractionPoint, frameReferenceSize } from '@/features/studio/lib/canvasCoords';

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
    videoWidth: number;
    videoHeight: number;
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
  // x/y/width/height are fractions of the content rect; positions/sizes here are
  // authored in px against a stable reference frame (the project's video resolution).
  const ref = frameReferenceSize(state.videoWidth, state.videoHeight);
  const refRect = { x: 0, y: 0, width: ref.width, height: ref.height };
  const box = toFractionBox({ x: 40, y: 40, width: w, height: h }, refRect);
  return {
    id: `image-${Date.now()}`,
    type: 'image',
    text: label,
    src,
    ...box,
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
  extraTimelineTracks?: ExtraTimelineTrack[];
  timelineTrackOrder?: string[];
  timelineTrackMuted?: Record<string, boolean>;
  timelineTrackPreviewHidden?: Record<string, boolean>;
  timelineTrackLabels?: Record<string, string>;
}>(state: T, patch: Partial<Pick<T, 'videoClips' | 'audioClips' | 'mediaDuration' | 'duration'>>) {
  const mediaDuration = patch.mediaDuration ?? state.mediaDuration;
  const videoClips = patch.videoClips ?? state.videoClips;
  const audioClips = patch.audioClips ?? state.audioClips;
  const fallback = patch.duration ?? state.duration;
  let result = {
    ...patch,
    mediaDuration,
    videoClips,
    audioClips,
    duration: computeTimelineDuration(mediaDuration, [...videoClips, ...audioClips], fallback),
  };

  if (
    patch.videoClips !== undefined &&
    state.extraTimelineTracks &&
    state.timelineTrackOrder &&
    state.timelineTrackMuted &&
    state.timelineTrackPreviewHidden &&
    state.timelineTrackLabels
  ) {
    const pruned = pruneEmptyExtraFootageTracks({
      extraTimelineTracks: state.extraTimelineTracks,
      videoClips,
      timelineTrackOrder: state.timelineTrackOrder,
      timelineTrackMuted: state.timelineTrackMuted,
      timelineTrackPreviewHidden: state.timelineTrackPreviewHidden,
      timelineTrackLabels: state.timelineTrackLabels,
    });
    if (pruned) result = { ...result, ...pruned };
  }

  return result;
}

function syncVideoToTimeline(
  state: {
    videoClips: MediaClip[];
    extraTimelineTracks: ExtraTimelineTrack[];
    timelineTrackOrder: string[];
    timelineTrackHidden: string[];
    timelineTrackPreviewHidden: Record<string, boolean>;
  },
  time: number,
  playing: boolean,
) {
  const video = getTimelineVideo();
  if (!video) return;

  const videoTrackIds = listVideoTrackIds(
    state.extraTimelineTracks,
    state.timelineTrackOrder,
    state.timelineTrackHidden,
  );
  const mapped = timelineToVideoSourceTime(
    state.videoClips,
    time,
    videoTrackIds,
    state.timelineTrackPreviewHidden,
  );
  const sourceTime = mapped?.sourceTime ?? timelineToSourceTime(state.videoClips, time);
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
  /** Browser compositor/export capture progress (0–100). */
  exportProgress: number;
  sidebarOpen: boolean;
  editorOpen: boolean;
  activeTab: EditorTab;
  projectId: string | null;
  projectName: string;
  projectStatus: 'done' | 'processing' | 'failed' | null;
  projectProgress: number;
  /** JPEG data URL (or remote URL) for recent-projects thumbnail. */
  projectThumbnailUrl: string | null;
  projectCoverTimeSec: number;
  projectCoverSource: 'video' | 'upload';
  aspectRatio: AspectRatioId;
  videoWidth: number;
  videoHeight: number;
  captionPosition: { x: number; y: number } | null;
  toolsDrawerOpen: boolean;
  activeStudioTool: StudioToolId;
  timelineZoom: number;
  timelineTrackMuted: Record<string, boolean>;
  /** Hide track from canvas preview (eye toggle). */
  timelineTrackPreviewHidden: Record<string, boolean>;
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
  /**
   * Coordinate space for videoClips/canvasElements x/y/width/height/fontSize.
   * 'legacy-px' = live on-screen pixels (pre-migration projects).
   * 'fraction-v2' = fraction (0..1) of the video content rect (current format).
   */
  compositionSpace: 'legacy-px' | 'fraction-v2';
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
  /** Active project template (asset slots may still be pending). */
  activeStudioTemplateId: string | null;
  pendingTemplateSlotIds: string[];
  /** Structured captions with word-level timing (source of truth when populated). */
  captionTracks: CaptionTracks;
  /** Beat detection analysis for auto-cut. */
  beatAnalysis: BeatAnalysis | null;
  autoCutSuggestions: AutoCutSuggestion[];
  showBeatMarkers: boolean;
  beatSensitivity: number;
  autoCutDensity: AutoCutDensity;

  setVideo: (file: File, url: string) => void;
  importMediaFiles: (files: FileList | File[]) => Promise<void>;
  removeMediaAsset: (id: string) => void;
  addMediaAssetToTimeline: (
    assetId: string,
    atTime?: number,
    options?: { trackId?: string },
  ) => void;
  setPrimaryVideoAsset: (assetId: string) => void;
  /**
   * One-time migration for legacy projects: convert videoClips/canvasElements
   * x/y/width/height/fontSize from live on-screen px (relative to the given
   * contentRect) to fractions (0..1) of it. No-op once already migrated.
   */
  migrateCompositionSpaceToFraction: (contentRect: { x: number; y: number; width: number; height: number }) => void;
  /** Restore media library from OPFS for the active project. */
  hydrateMediaLibrary: (projectId: string, persistedAssets?: PersistedMediaAsset[]) => Promise<void>;
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
      mediaAssets?: PersistedMediaAsset[];
      timelineTrackHidden?: string[];
      timelineTrackOrder?: string[];
      extraTimelineTracks?: ExtraTimelineTrack[];
      compositionSpace?: 'legacy-px' | 'fraction-v2';
      projectCover?: { url: string; source: 'video' | 'upload'; timeSec?: number };
    };
    thumbnailUrl?: string;
  }) => void;
  setProjectCover: (cover: { url: string; source: 'video' | 'upload'; timeSec?: number } | null) => void;
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
  setExportProgress: (progress: number) => void;
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
  setTransitionDuration: (transitionId: string, durationSec: number) => void;
  setCompositionBackground: (patch: Partial<CompositionBackground>) => void;
  updateClipBackground: (clipId: string, patch: Partial<CompositionBackground>) => void;
  applyBackgroundToAllVideoClips: (background: CompositionBackground) => void;
  getVideoCssFilter: () => string;
  setTimelineZoom: (zoom: number) => void;
  toggleTimelineTrackMuted: (trackId: TimelineTrackId) => void;
  toggleTimelineTrackPreviewHidden: (trackId: TimelineTrackId) => void;
  resolveTimelineDropTrack: (input: TimelinePlacementInput) => string;
  /** After moving/resizing a clip, move it to a free track when it overlaps on the current one. */
  resolveTimelineClipOverlap: (clipId: string, trackId: string) => void;
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
  selectAllTimelineClips: () => void;
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
  setCaptionTracks: (type: 'transcript' | 'translation', segments: CaptionSegment[]) => void;
  updateCaptionWord: (
    segmentIndex: number,
    wordIndex: number,
    patch: Partial<{ startSec: number; endSec: number; text: string }>,
    type: 'transcript' | 'translation',
  ) => void;
  removeTimelineClip: (trackId: TimelineTrackId, clipId: string) => void;
  addTimelineClip: (trackId: TimelineTrackId, time: number) => void;
  addTimelineTrack: (type?: ExtraTrackType, options?: { insertAfter?: string }) => string;
  ensureTimelineTrackVisible: (trackId: string) => void;
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
  /** Copy video audio onto the audio track (video keeps sound). */
  extractAudioFromVideoClip: (clipId?: string) => string | null;
  /** Extract audio and mute the video clip (split audio from video). */
  detachAudioFromVideoClip: (clipId?: string) => string | null;
  /** Copy every clip's audio on a video track onto the audio track (video keeps sound). */
  extractAudioFromVideoTrack: (trackId?: string) => string[];
  /** Extract every clip's audio on a video track and mute the whole track's clips. */
  detachAudioFromVideoTrack: (trackId?: string) => string[];
  /** Apply a studio template blueprint to the current project. */
  applyStudioTemplate: (templateId: string, bindings?: StudioTemplateAssetBinding[]) => void;
  clearStudioTemplate: () => void;
  initSpeakersFromTranscript: (text: string) => void;
  setBeatAnalysis: (analysis: BeatAnalysis | null) => void;
  setAutoCutSuggestions: (suggestions: AutoCutSuggestion[]) => void;
  setShowBeatMarkers: (show: boolean) => void;
  setBeatSensitivity: (sensitivity: number) => void;
  setAutoCutDensity: (density: AutoCutDensity) => void;
  clearBeatAnalysis: () => void;
  applyAutoCutSuggestions: () => void;
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
  exportProgress: 0,
  sidebarOpen: true,
  editorOpen: true,
  activeTab: 'translate' as EditorTab,
  projectId: null as string | null,
  projectName: '',
  projectStatus: null as 'done' | 'processing' | 'failed' | null,
  projectProgress: 0,
  projectThumbnailUrl: null as string | null,
  projectCoverTimeSec: 0,
  projectCoverSource: 'video' as 'video' | 'upload',
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
  timelineTrackPreviewHidden: {} as Record<string, boolean>,
  timelineTrackOrder: [] as string[],
  timelineTrackLabels: {} as Record<string, string>,
  timelineTrackHidden: [...DEFAULT_HIDDEN_CORE_TRACKS],
  extraTimelineTracks: [] as ExtraTimelineTrack[],
  selectedTimelineClip: null as TimelineSelectionItem | null,
  selectedTimelineClips: [] as TimelineSelectionItem[],
  timelineClipboard: null as CanvasElement[] | null,
  canvasElements: [] as CanvasElement[],
  compositionSpace: 'fraction-v2' as 'legacy-px' | 'fraction-v2',
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
  activeStudioTemplateId: null as string | null,
  pendingTemplateSlotIds: [] as string[],
  captionTracks: { transcript: [], translation: [] } as CaptionTracks,
  beatAnalysis: null as BeatAnalysis | null,
  autoCutSuggestions: [] as AutoCutSuggestion[],
  showBeatMarkers: true,
  beatSensitivity: 0.5,
  autoCutDensity: 'every-beat' as AutoCutDensity,
};

function revokeAllMediaAssets(assets: MediaAsset[], videoUrl: string | null) {
  for (const asset of assets) {
    if (asset.url) URL.revokeObjectURL(asset.url);
    forgetMediaFile(asset.id);
  }
  if (videoUrl && !assets.some((asset) => asset.url === videoUrl)) {
    URL.revokeObjectURL(videoUrl);
  }
}

function emptyMediaFields() {
  return {
    mediaAssets: [] as MediaAsset[],
    videoFile: null as File | null,
    videoUrl: null as string | null,
    videoSessionId: null as string | null,
    mediaDuration: 0,
    videoWidth: 0,
    videoHeight: 0,
  };
}

/** Set when media is added before `projectId` exists (upload → create project). */
let pendingOpfsMediaSync = false;

async function syncMediaAssetsToOpfs(projectId: string, assets: MediaAsset[]): Promise<void> {
  if (!projectId) return;
  await Promise.all(
    assets.map(async (asset) => {
      const file = getMediaFile(asset.id);
      if (!file) return;
      await persistMediaToOpfs(projectId, asset, file).catch(() => undefined);
    }),
  );
}

function scheduleMediaOpfsSync(projectId: string | null, assets: MediaAsset[]) {
  if (projectId) {
    void syncMediaAssetsToOpfs(projectId, assets);
    return;
  }
  pendingOpfsMediaSync = true;
}

async function flushPendingMediaOpfsSync(projectId: string, assets: MediaAsset[]) {
  if (!projectId || !pendingOpfsMediaSync) return;
  pendingOpfsMediaSync = false;
  await syncMediaAssetsToOpfs(projectId, assets);
}

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

    void scheduleMediaOpfsSync(get().projectId, get().mediaAssets);
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
      scheduleMediaOpfsSync(get().projectId, get().mediaAssets);
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
    const projectId = state.projectId;
    if (projectId) void removeMediaFromOpfs(projectId, id).catch(() => undefined);
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
    const targetType = targetTrack
      ? trackTypeFromId(String(targetTrack), asset.kind === 'audio' ? 'audio' : asset.kind === 'video' ? 'video' : 'image')
      : undefined;

    if (asset.kind === 'image') {
      let trackId =
        targetTrack &&
        (targetTrack === 'image' ||
          targetTrack === 'sticker' ||
          targetTrack === 'effect' ||
          targetTrack === 'overlay' ||
          String(targetTrack).startsWith('image-') ||
          String(targetTrack).startsWith('sticker-') ||
          String(targetTrack).startsWith('effect-') ||
          String(targetTrack).startsWith('overlay-'))
          ? String(targetTrack) === 'overlay' || String(targetTrack).startsWith('overlay-')
            ? 'image'
            : String(targetTrack)
          : 'image';
      const clipDuration = Math.max(1, asset.duration || 4);
      trackId = get().resolveTimelineDropTrack({
        trackId,
        trackType: trackTypeFromId(trackId, 'image'),
        atTime: time,
        duration: clipDuration,
        mediaKind: 'image',
      });
      get().addCanvasImageFromUrl(asset.url, {
        label: asset.name,
        startTime: time,
        endTime: time + clipDuration,
        keepStudioTool: true,
        trackId,
      });
      if (openInspector) set({ activeTab: 'inspector', editorOpen: true });
      return;
    }

    if (asset.kind === 'video') {
      const clipDuration = Math.max(
        0.4,
        asset.duration || state.mediaDuration || state.duration || 1,
      );
      let trackId = targetTrack && isVideoTimelineTrack(String(targetTrack)) ? String(targetTrack) : 'video';
      trackId = get().resolveTimelineDropTrack({
        trackId,
        trackType: 'video',
        atTime: time,
        duration: clipDuration,
        mediaKind: 'video',
      });
      if (!state.videoUrl) get().setPrimaryVideoAsset(assetId);
      const latest = get();
      const clip = createMediaClip({
        name: asset.name,
        duration: clipDuration,
        start: time,
        sourceStart: 0,
        trackId,
        mediaAssetId: assetId,
      });
      set({
        ...pushHistory(latest),
        ...withTimelineDuration(latest, {
          videoClips: [...latest.videoClips, clip],
        }),
        selectedTimelineClip: { trackId: trackId as TimelineTrackId, clipId: clip.id },
        selectedTimelineClips: [{ trackId: trackId as TimelineTrackId, clipId: clip.id }],
        ...(openInspector ? { activeTab: 'inspector' as const, editorOpen: true } : {}),
      });
      return;
    }

    if (asset.kind === 'audio') {
      const clipDuration = Math.max(0.4, asset.duration || 1);
      let trackId = targetTrack && isAudioLikeTimelineTrack(String(targetTrack)) ? String(targetTrack) : 'audio';
      trackId = get().resolveTimelineDropTrack({
        trackId,
        trackType: trackTypeFromId(trackId, 'audio'),
        atTime: time,
        duration: clipDuration,
        mediaKind: 'audio',
      });
      const clip = createMediaClip({
        name: asset.name,
        duration: clipDuration,
        start: time,
        sourceStart: 0,
        trackId,
        mediaAssetId: assetId,
      });
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, {
          audioClips: [...state.audioClips, clip],
        }),
        selectedTimelineClip: { trackId: trackId as TimelineTrackId, clipId: clip.id },
        selectedTimelineClips: [{ trackId: trackId as TimelineTrackId, clipId: clip.id }],
        ...(openInspector ? { activeTab: 'inspector' as const, editorOpen: true } : {}),
      });
    }
  },

  hydrateMediaLibrary: async (projectId, persistedAssets) => {
    if (!projectId) return;

    try {
      const hydrated = await hydrateMediaFromOpfs(projectId, storeMediaFile);
      const merged = mergePersistedMediaAssets(hydrated, persistedAssets).filter(
        (asset) => asset.url.length > 0,
      );
      if (!merged.length) {
        set(emptyMediaFields());
        return;
      }

      set({ mediaAssets: merged });

      const primary = merged.find((asset) => asset.isPrimary) ?? merged.find((a) => a.kind === 'video');
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

  resetProject: () => {
    const state = get();
    pendingOpfsMediaSync = false;
    revokeAllMediaAssets(state.mediaAssets, state.videoUrl);
    set({ ...initialState });
  },

  setProjectId: (projectId) => {
    set({ projectId });
    if (projectId) void flushPendingMediaOpfsSync(projectId, get().mediaAssets);
  },

  hydrateProject: (input) => {
    const state = get();
    const editor = input.editorState;
    const switching = state.projectId != null && state.projectId !== input.id;
    if (switching) {
      pendingOpfsMediaSync = false;
      revokeAllMediaAssets(state.mediaAssets, state.videoUrl);
    }
    const videoClips = editor?.videoClips ?? (switching ? [] : state.videoClips);
    const audioClips = editor?.audioClips ?? (switching ? [] : state.audioClips);
    let timelineTrackHidden = editor?.timelineTrackHidden
      ? [...editor.timelineTrackHidden]
      : switching
        ? [...DEFAULT_HIDDEN_CORE_TRACKS]
        : [...state.timelineTrackHidden];

    if (!editor?.timelineTrackHidden) {
      if (videoClips.length > 0) {
        timelineTrackHidden = timelineTrackHidden.filter((id) => id !== 'video');
      }
      if (audioClips.length > 0) {
        timelineTrackHidden = timelineTrackHidden.filter((id) => id !== 'audio' && id !== 'sound');
      }
      const canvasElements = editor?.canvasElements ?? [];
      if (canvasElements.some((el) => el.type === 'text')) {
        timelineTrackHidden = timelineTrackHidden.filter((id) => id !== 'text');
      }
      if (canvasElements.some((el) => el.type === 'image' || el.type === 'logo')) {
        timelineTrackHidden = timelineTrackHidden.filter((id) => id !== 'image' && id !== 'sticker');
      }
    }

    const fallbackDuration = input.durationSec ?? (switching ? 0 : state.duration) ?? 0;
    const duration = computeTimelineDuration(
      switching ? 0 : state.mediaDuration,
      [...videoClips, ...audioClips],
      fallbackDuration > 0 ? fallbackDuration : 30,
    );
    set({
      ...(switching ? emptyMediaFields() : {}),
      projectId: input.id,
      projectName: input.title,
      aspectRatio: input.aspectRatio,
      projectStatus: input.status,
      projectProgress: input.progress ?? (input.status === 'done' ? 100 : 0),
      duration,
      ...(editor?.videoClips ? { videoClips: editor.videoClips } : switching ? { videoClips: [] } : {}),
      ...(editor?.audioClips ? { audioClips: editor.audioClips } : switching ? { audioClips: [] } : {}),
      ...(editor?.canvasElements
        ? { canvasElements: editor.canvasElements }
        : switching
          ? { canvasElements: [] }
          : {}),
      ...(editor?.transcript != null ? { transcript: editor.transcript } : switching ? { transcript: '' } : {}),
      ...(editor?.translatedText != null
        ? { translatedText: editor.translatedText }
        : switching
          ? { translatedText: '' }
          : {}),
      timelineTrackHidden,
      ...(editor?.timelineTrackOrder
        ? { timelineTrackOrder: editor.timelineTrackOrder }
        : switching
          ? { timelineTrackOrder: [] }
          : {}),
      ...(editor?.extraTimelineTracks
        ? { extraTimelineTracks: editor.extraTimelineTracks }
        : switching
          ? { extraTimelineTracks: [] }
          : {}),
      // Missing marker on a project that already has composition data means it
      // predates the fraction-space migration — flag it for one-time conversion.
      compositionSpace:
        editor?.compositionSpace ??
        (editor?.videoClips?.some((c) => c.x != null) || editor?.canvasElements?.length
          ? 'legacy-px'
          : 'fraction-v2'),
      projectThumbnailUrl:
        input.thumbnailUrl ??
        editor?.projectCover?.url ??
        (switching ? null : state.projectThumbnailUrl),
      projectCoverTimeSec: editor?.projectCover?.timeSec ?? (switching ? 0 : state.projectCoverTimeSec),
      projectCoverSource:
        editor?.projectCover?.source ?? (switching ? 'video' : state.projectCoverSource),
      projectUndoStack: [],
      projectRedoStack: [],
      isTimelinePlaying: false,
    });
    void flushPendingMediaOpfsSync(input.id, get().mediaAssets);
  },

  setProjectCover: (cover) =>
    set({
      projectThumbnailUrl: cover?.url ?? null,
      projectCoverTimeSec: cover?.timeSec ?? 0,
      projectCoverSource: cover?.source ?? 'video',
    }),

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
    let pendingTemplateSlotIds = state.pendingTemplateSlotIds;

    if (
      mediaDuration > 0 &&
      state.videoFile &&
      videoClips.length === 0 &&
      state.activeStudioTemplateId &&
      pendingTemplateSlotIds.includes('primary-video')
    ) {
      const template = getStudioTemplate(state.activeStudioTemplateId);
      const blueprintClip = template?.blueprint?.videoClips?.find(
        (c) => c.slotId === 'primary-video',
      );
      if (blueprintClip) {
        videoClips = [
          createMediaClip({
            name: state.videoFile.name,
            duration: Math.min(blueprintClip.duration, mediaDuration),
            start: blueprintClip.start,
            sourceStart: blueprintClip.sourceStart ?? 0,
          }),
        ];
        pendingTemplateSlotIds = pendingTemplateSlotIds.filter((id) => id !== 'primary-video');
      }
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
      pendingTemplateSlotIds,
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
    syncVideoToTimeline(state, next, state.isTimelinePlaying);
  },

  setTimelinePlaying: (playing) => {
    const state = get();
    if (playing) {
      const atEnd = state.duration > 0 && state.currentTime >= state.duration - 0.05;
      const time = atEnd ? 0 : state.currentTime;
      set({ isTimelinePlaying: true, currentTime: time });
      syncVideoToTimeline(state, time, true);
      // If playhead is in a gap (or no video), the rAF clock still advances.
      const videoTrackIds = listVideoTrackIds(
        state.extraTimelineTracks,
        state.timelineTrackOrder,
        state.timelineTrackHidden,
      );
      const clip = findVideoClipForPreview(
        state.videoClips,
        time,
        videoTrackIds,
        state.timelineTrackPreviewHidden,
      );
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
    const applied = applyMediaClipToLists(
      state.videoClips,
      state.audioClips,
      id,
      patch,
    );
    if (!applied) return;
    set({
      ...(recordHistory ? pushHistory(state) : {}),
      ...withTimelineDuration(state, { [applied.listKey]: applied.nextList }),
    });
  },
  setStatus: (status) => set({ status }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setIsExporting: (exporting) =>
    set({ isExporting: exporting, ...(exporting ? {} : { exportProgress: 0 }) }),
  setExportProgress: (progress) =>
    set({ exportProgress: Math.min(100, Math.max(0, progress)) }),
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

      let timelineTransitions = s.projectEditor.timelineTransitions;
      if (edge === 'in') {
        const pair = findAdjacentPairForClip(s.videoClips, clipId);
        if (pair && transitionId !== 'cut') {
          const durationSec = getTransitionDefaultDurationSec(transitionId);
          const id = `trans-${pair.outgoing.id}-${pair.incoming.id}`;
          timelineTransitions = upsertTimelineTransition(timelineTransitions, {
            id,
            presetId: transitionId,
            outgoingClipId: pair.outgoing.id,
            incomingClipId: pair.incoming.id,
            durationSec,
          });
        } else if (pair && transitionId === 'cut') {
          timelineTransitions = timelineTransitions.filter(
            (t) =>
              !(
                t.outgoingClipId === pair.outgoing.id && t.incomingClipId === pair.incoming.id
              ),
          );
        }
      }

      return {
        projectEditor: { ...s.projectEditor, clipEdits, timelineTransitions },
      };
    }),

  setTransitionDuration: (transitionId, durationSec) =>
    set((s) => ({
      projectEditor: {
        ...s.projectEditor,
        timelineTransitions: s.projectEditor.timelineTransitions.map((t) =>
          t.id === transitionId ? { ...t, durationSec: Math.max(0.05, durationSec) } : t,
        ),
      },
    })),

  setCompositionBackground: (patch) =>
    set((s) => ({
      projectEditor: {
        ...s.projectEditor,
        compositionBackground: {
          ...(s.projectEditor.compositionBackground ?? DEFAULT_COMPOSITION_BACKGROUND),
          ...patch,
        },
      },
    })),

  updateClipBackground: (clipId, patch) => {
    const state = get();
    const clip = state.videoClips.find((item) => item.id === clipId);
    if (!clip) return;
    const base =
      clip.background ?? state.projectEditor.compositionBackground ?? DEFAULT_COMPOSITION_BACKGROUND;
    state.updateMediaClip(clipId, {
      background: { ...base, ...patch },
    });
  },

  applyBackgroundToAllVideoClips: (background) =>
    set((s) => ({
      videoClips: s.videoClips.map((clip) => ({ ...clip, background: { ...background } })),
    })),

  getVideoCssFilter: () => getFilterCss(get().projectEditor.videoFilterId),

  setTimelineZoom: (zoom) =>
    set({
      timelineZoom: Math.min(TIMELINE_ZOOM_MAX, Math.max(TIMELINE_ZOOM_MIN, zoom)),
    }),
  toggleTimelineTrackMuted: (trackId) =>
    set((s) => ({
      timelineTrackMuted: { ...s.timelineTrackMuted, [trackId]: !s.timelineTrackMuted[trackId] },
    })),
  toggleTimelineTrackPreviewHidden: (trackId) =>
    set((s) => ({
      timelineTrackPreviewHidden: {
        ...s.timelineTrackPreviewHidden,
        [trackId]: !s.timelineTrackPreviewHidden[trackId],
      },
    })),
  resolveTimelineDropTrack: (input) => {
    const maxAttempts = 24;
    let trackId = input.trackId;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const state = get();
      const pick = pickTimelineTrackForPlacement(state, { ...input, trackId });
      trackId = pick.trackId;

      if (isCoreTimelineTrack(trackId)) get().ensureTimelineTrackVisible(trackId);

      if (!pick.needsNewTrack) return trackId;

      trackId = get().addTimelineTrack(extraTrackTypeForPlacement(input), {
        insertAfter: pick.insertAfter,
      });
    }

    return trackId;
  },

  resolveTimelineClipOverlap: (clipId, trackId) => {
    const state = get();

    const element = state.canvasElements.find((el) => el.id === clipId);
    if (element) {
      const duration = Math.max(0.4, element.endTime - element.startTime);
      const trackType = trackTypeFromId(trackId, element.type === 'text' ? 'text' : 'image');
      const resolvedTrackId = get().resolveTimelineDropTrack({
        trackId,
        trackType,
        atTime: element.startTime,
        duration,
        excludeClipId: clipId,
      });
      const storedTrackId = canvasTrackIdFromResolved(resolvedTrackId);
      const currentStored =
        element.trackId ?? (isTextTimelineTrack(trackId) ? undefined : trackId);
      if (storedTrackId === currentStored && resolvedTrackId === trackId) return;

      const item: TimelineSelectionItem = {
        trackId: resolvedTrackId as TimelineTrackId,
        clipId,
      };
      set({
        ...pushHistory(state),
        canvasElements: state.canvasElements.map((el) =>
          el.id === clipId ? { ...el, trackId: storedTrackId } : el,
        ),
        ...buildTimelineSelection([item], item),
      });
      return;
    }

    const videoClip = state.videoClips.find((c) => c.id === clipId);
    if (videoClip) {
      const resolvedTrackId = get().resolveTimelineDropTrack({
        trackId,
        trackType: 'video',
        atTime: videoClip.start,
        duration: videoClip.duration,
        mediaKind: 'video',
        excludeClipId: clipId,
      });
      if ((videoClip.trackId ?? 'video') === resolvedTrackId) return;

      const videoClips = state.videoClips.map((c) =>
        c.id === clipId ? { ...c, trackId: resolvedTrackId } : c,
      );
      const item: TimelineSelectionItem = {
        trackId: resolvedTrackId as TimelineTrackId,
        clipId,
      };
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, { videoClips }),
        ...buildTimelineSelection([item], item),
      });
      return;
    }

    const audioClip = state.audioClips.find((c) => c.id === clipId);
    if (audioClip) {
      const trackType = trackTypeFromId(trackId, 'audio');
      const resolvedTrackId = get().resolveTimelineDropTrack({
        trackId,
        trackType,
        atTime: audioClip.start,
        duration: audioClip.duration,
        mediaKind: 'audio',
        excludeClipId: clipId,
      });
      if ((audioClip.trackId ?? 'audio') === resolvedTrackId) return;

      const audioClips = state.audioClips.map((c) =>
        c.id === clipId ? { ...c, trackId: resolvedTrackId } : c,
      );
      const item: TimelineSelectionItem = {
        trackId: resolvedTrackId as TimelineTrackId,
        clipId,
      };
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, { audioClips }),
        ...buildTimelineSelection([item], item),
      });
    }
  },
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

  selectAllTimelineClips: () => {
    const state = get();
    const tracks = buildTimelineTracks({
      duration: state.duration,
      audioBase64: state.audioBase64,
      videoFile: state.videoFile,
      videoClips: state.videoClips,
      audioClips: state.audioClips,
      canvasElements: state.canvasElements,
      extraTimelineTracks: state.extraTimelineTracks,
      timelineTrackOrder: state.timelineTrackOrder,
      timelineTrackLabels: state.timelineTrackLabels,
      timelineTrackHidden: state.timelineTrackHidden,
      transcript: state.transcript,
      translatedText: state.translatedText,
      captionTracks: state.captionTracks,
    });
    const items = collectAllTimelineSelectionItems(tracks);
    if (!items.length) return;
    get().setTimelineSelection(items, items[0] ?? null, { syncCanvas: true });
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
    const trackKey = type === 'transcript' ? 'transcript' : 'translation';
    const structured = state.captionTracks[trackKey];

    if (structured.length > 0 && structured[index]) {
      const nextTracks = updateCaptionSegmentText(structured, index, newText);
      const serialized = captionSegmentsToTranscript(nextTracks);
      set({
        captionTracks: { ...state.captionTracks, [trackKey]: nextTracks },
        ...(type === 'transcript' ? { transcript: serialized } : { translatedText: serialized }),
      });
      return;
    }

    if (type === 'transcript') {
      const segments = parseSegments(state.transcript);
      set({ transcript: updateSegmentText(segments, index, newText) });
    } else {
      const segments = parseSegments(state.translatedText);
      set({ translatedText: updateSegmentText(segments, index, newText) });
    }
  },

  setCaptionTracks: (type, segments) => {
    const state = get();
    const trackKey = type === 'transcript' ? 'transcript' : 'translation';
    const serialized = captionSegmentsToTranscript(segments);
    set({
      captionTracks: { ...state.captionTracks, [trackKey]: segments },
      ...(type === 'transcript' ? { transcript: serialized } : { translatedText: serialized }),
    });
  },

  updateCaptionWord: (segmentIndex, wordIndex, patch, type) => {
    const state = get();
    const trackKey = type === 'transcript' ? 'transcript' : 'translation';
    const structured = state.captionTracks[trackKey];
    if (!structured.length) return;

    const nextTracks = updateCaptionWordTiming(structured, segmentIndex, wordIndex, patch);
    const serialized = captionSegmentsToTranscript(nextTracks);
    set({
      captionTracks: { ...state.captionTracks, [trackKey]: nextTracks },
      ...(type === 'transcript' ? { transcript: serialized } : { translatedText: serialized }),
    });
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

    if (isVideoTimelineTrack(trackId)) {
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, {
          videoClips: state.videoClips.filter((clip) => clip.id !== clipId),
        }),
        ...selectionPatch,
      });
      return;
    }

    if (isAudioLikeTimelineTrack(trackId)) {
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
      const ref = frameReferenceSize(state.videoWidth, state.videoHeight);
      const refRect = { x: 0, y: 0, width: ref.width, height: ref.height };
      const box = toFractionBox({ x: 40, y: 40, width: 220, height: 32 }, refRect);
      const element: CanvasElement = {
        id,
        type: 'text',
        text: 'New text',
        ...box,
        fontSize: toFractionFontSize(20, refRect),
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

  addTimelineTrack: (type: ExtraTrackType = 'image', options?: { insertAfter?: string }) => {
    const state = get();
    const coreId = (DEFAULT_TIMELINE_TRACK_ORDER as string[]).find(
      (id) => id === type && state.timelineTrackHidden.includes(id),
    );
    if (coreId) {
      get().ensureTimelineTrackVisible(coreId);
      return coreId;
    }

    const sameType = state.extraTimelineTracks.filter((t) => t.type === type).length;
    const track: ExtraTimelineTrack = {
      id: `${type}-${Date.now()}`,
      type,
      label: `${TRACK_TYPE_LABELS[type]} ${sameType + 2}`,
    };
    const baseOrder =
      state.timelineTrackOrder.length > 0
        ? state.timelineTrackOrder
        : [...DEFAULT_TIMELINE_TRACK_ORDER];
    const timelineTrackOrder = options?.insertAfter
      ? insertTrackBelowOrder(baseOrder, options.insertAfter, track.id)
      : [...baseOrder, track.id];
    set({
      ...pushHistory(state),
      extraTimelineTracks: [...state.extraTimelineTracks, track],
      timelineTrackOrder,
      timelineTrackMuted: { ...state.timelineTrackMuted, [track.id]: false },
      timelineTrackPreviewHidden: { ...state.timelineTrackPreviewHidden, [track.id]: false },
    });
    return track.id;
  },

  ensureTimelineTrackVisible: (trackId) => {
    const state = get();
    if (trackId === 'audio') return;
    if (!isCoreTimelineTrack(trackId)) return;
    if (!state.timelineTrackHidden.includes(trackId)) return;

    const order =
      state.timelineTrackOrder.length > 0
        ? state.timelineTrackOrder
        : [...DEFAULT_TIMELINE_TRACK_ORDER];
    set({
      timelineTrackHidden: state.timelineTrackHidden.filter((id) => id !== trackId),
      timelineTrackOrder: order.includes(trackId) ? order : [...order, trackId],
      timelineTrackMuted: { ...state.timelineTrackMuted, [trackId]: false },
    });
  },

  removeTimelineTrack: (trackId) => {
    if (!isDeletableTimelineTrack(trackId)) return;
    const state = get();
    const muted = { ...state.timelineTrackMuted };
    delete muted[trackId];
    const previewHidden = { ...state.timelineTrackPreviewHidden };
    delete previewHidden[trackId];
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
        timelineTrackPreviewHidden: previewHidden,
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
      timelineTrackPreviewHidden: previewHidden,
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
      const duration = Math.max(0.4, element.endTime - element.startTime);
      const resolvedTrackId = get().resolveTimelineDropTrack({
        trackId: toTrackId,
        trackType: toType,
        atTime: element.startTime,
        duration,
        excludeClipId: clipId,
      });
      const nextTrackId = canvasTrackIdFromResolved(resolvedTrackId);
      const item: TimelineSelectionItem = {
        trackId: resolvedTrackId as TimelineTrackId,
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

    // Media clips: video can move between video tracks; audio between audio/sound tracks.
    const videoClip = state.videoClips.find((c) => c.id === clipId);
    if (videoClip && toType === 'video') {
      const targetId = get().resolveTimelineDropTrack({
        trackId: toTrackId,
        trackType: 'video',
        atTime: videoClip.start,
        duration: videoClip.duration,
        mediaKind: 'video',
        excludeClipId: clipId,
      });
      const videoClips = state.videoClips.map((c) =>
        c.id === clipId ? { ...c, trackId: targetId } : c,
      );
      const item: TimelineSelectionItem = {
        trackId: targetId as TimelineTrackId,
        clipId,
      };
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, { videoClips }),
        ...buildTimelineSelection([item], item),
      });
      return;
    }

    if (fromType === 'video' || toType === 'video') return;
    if (
      (fromType === 'audio' || fromType === 'sound') &&
      (toType === 'audio' || toType === 'sound')
    ) {
      const audioClip = state.audioClips.find((c) => c.id === clipId);
      if (!audioClip) return;
      const targetId = get().resolveTimelineDropTrack({
        trackId: toTrackId,
        trackType: toType,
        atTime: audioClip.start,
        duration: audioClip.duration,
        mediaKind: 'audio',
        excludeClipId: clipId,
      });
      const audioClips = state.audioClips.map((c) =>
        c.id === clipId ? { ...c, trackId: targetId } : c,
      );
      const item: TimelineSelectionItem = {
        trackId: targetId as TimelineTrackId,
        clipId,
      };
      set({
        ...pushHistory(state),
        ...withTimelineDuration(state, { audioClips }),
        ...buildTimelineSelection([item], item),
      });
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

  migrateCompositionSpaceToFraction: (contentRect) => {
    const state = get();
    if (state.compositionSpace === 'fraction-v2') return;
    if (contentRect.width <= 0 || contentRect.height <= 0) return;

    const videoClips = state.videoClips.map((clip) => {
      if (clip.x == null && clip.y == null && clip.width == null && clip.height == null) return clip;
      const box = toFractionBox(
        {
          x: clip.x ?? contentRect.x,
          y: clip.y ?? contentRect.y,
          width: clip.width ?? contentRect.width,
          height: clip.height ?? contentRect.height,
        },
        contentRect,
      );
      return { ...clip, ...box };
    });

    const canvasElements = state.canvasElements.map((el) => {
      const box = toFractionBox({ x: el.x, y: el.y, width: el.width, height: el.height }, contentRect);
      const keyframes = el.keyframes?.map((kf) => ({
        ...kf,
        ...(kf.x != null ? { x: toFractionPoint({ x: kf.x, y: kf.y ?? el.y }, contentRect).x } : {}),
        ...(kf.y != null ? { y: toFractionPoint({ x: kf.x ?? el.x, y: kf.y }, contentRect).y } : {}),
      }));
      return {
        ...el,
        ...box,
        fontSize: toFractionFontSize(el.fontSize, contentRect),
        ...(keyframes ? { keyframes } : {}),
      };
    });

    set({ videoClips, canvasElements, compositionSpace: 'fraction-v2' });
  },
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

    const item = timelineItemForCanvasElement(element);

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
    const recordHistory = options?.history !== false;
    const applied = applyCanvasElementPatch(
      state.canvasElements,
      state.transcript,
      state.translatedText,
      id,
      patch,
    );
    if (!applied) return;

    set({
      canvasElements: applied.canvasElements,
      ...(applied.transcript !== undefined ? { transcript: applied.transcript } : {}),
      ...(applied.translatedText !== undefined
        ? { translatedText: applied.translatedText }
        : {}),
      ...(recordHistory ? pushHistory(state) : {}),
    });
  },

  duplicateCanvasElement: (id) => {
    const state = get();
    const element = state.canvasElements.find((el) => el.id === id);
    if (!element) return;
    const newId = `${element.type}-${Date.now()}`;
    // Small nudge (as a fraction of the frame) so the duplicate doesn't sit exactly on top.
    const NUDGE_FRACTION = 0.03;
    const sourceTrackId =
      element.trackId ?? (element.type === 'text' ? 'text' : 'image');
    const duration = Math.max(0.4, element.endTime - element.startTime);
    const resolvedTrackId = get().resolveTimelineDropTrack({
      trackId: sourceTrackId,
      trackType: trackTypeFromId(sourceTrackId, element.type === 'text' ? 'text' : 'image'),
      atTime: element.startTime,
      duration,
    });
    const dup: CanvasElement = {
      ...element,
      id: newId,
      x: element.x + NUDGE_FRACTION,
      y: element.y + NUDGE_FRACTION,
      trackId: canvasTrackIdFromResolved(resolvedTrackId),
    };
    const item: TimelineSelectionItem = {
      trackId: resolvedTrackId as TimelineTrackId,
      clipId: newId,
    };
    set({
      ...pushHistory(state),
      canvasElements: [...state.canvasElements, dup],
      selectedCanvasElementId: newId,
      canvasTool: 'select',
      ...buildTimelineSelection([item], item),
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
      const ref = frameReferenceSize(get().videoWidth, get().videoHeight);
      get().updateCanvasElement(id, {
        src: url,
        text: file.name,
        width: Math.round(img.naturalWidth * scale) / ref.width,
        height: Math.round(img.naturalHeight * scale) / ref.height,
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
    const ref = frameReferenceSize(state.videoWidth, state.videoHeight);
    const box = toFractionBox({ x: 24, y: 24, width: 120, height: 48 }, {
      x: 0,
      y: 0,
      width: ref.width,
      height: ref.height,
    });
    const element: CanvasElement = {
      id,
      type: 'logo',
      text: file.name,
      src: url,
      ...box,
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
    const templateDuration = template.duration ?? 4;
    const endTime = Math.min(duration, time + templateDuration);
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
    const rawTrackId =
      options?.trackId &&
      (options.trackId === 'text' || String(options.trackId).startsWith('text-'))
        ? options.trackId
        : 'text';
    const placementDuration = Math.max(0.4, endTime - time);
    const resolvedTrackId = get().resolveTimelineDropTrack({
      trackId: rawTrackId,
      trackType: 'text',
      atTime: time,
      duration: placementDuration,
    });
    get().ensureTimelineTrackVisible(resolvedTrackId === 'text' ? 'text' : resolvedTrackId);

    // x/y/width/height/fontSize above are px relative to canvasSize — convert to
    // fractions of it, since composition fields are stored as fractions.
    const canvasRect = { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height };
    const box = toFractionBox({ x, y, width: placement.width, height: placement.height }, canvasRect);

    const element: CanvasElement = {
      id,
      type: 'text',
      text: displayText,
      templateId: template.id,
      textStyle: { ...template.style },
      fontFamily: template.fontFamily,
      textEffect: template.textEffect,
      ...box,
      fontSize: toFractionFontSize(template.style.fontSize, canvasRect),
      rotation: 0,
      opacity: 1,
      startTime: time,
      endTime: Math.max(time + 0.4, endTime),
      trackId: canvasTrackIdFromResolved(resolvedTrackId),
    };

    const item: TimelineSelectionItem = {
      trackId: resolvedTrackId as TimelineTrackId,
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
    const result = applySplitAtPlayhead({
      currentTime: state.currentTime,
      duration: state.duration,
      transcript: state.transcript,
      translatedText: state.translatedText,
      status: state.status,
      videoClips: state.videoClips,
      audioClips: state.audioClips,
      canvasElements: state.canvasElements,
      selectedTimelineClip: state.selectedTimelineClip,
    });
    if (!result) return;

    set({
      ...pushHistory(state),
      ...withTimelineDuration(state, {
        videoClips: result.videoClips ?? state.videoClips,
        audioClips: result.audioClips ?? state.audioClips,
      }),
      ...(result.canvasElements ? { canvasElements: result.canvasElements } : {}),
      ...(result.transcript !== undefined ? { transcript: result.transcript } : {}),
      ...(result.translatedText !== undefined
        ? { translatedText: result.translatedText }
        : {}),
      selectedTimelineClip: result.selectedTimelineClip,
      selectedTimelineClips: result.selectedTimelineClips,
      selectedCanvasElementId: result.selectedCanvasElementId,
    });
  },

  extractAudioFromVideoClip: (clipId) => {
    const state = get();
    const videoTrackIds = listVideoTrackIds(
      state.extraTimelineTracks,
      state.timelineTrackOrder,
      state.timelineTrackHidden,
    );
    const selectedIsVideo =
      state.selectedTimelineClip &&
      (state.selectedTimelineClip.trackId === 'video' ||
        String(state.selectedTimelineClip.trackId).startsWith('video-'));
    const videoClip =
      (clipId ? state.videoClips.find((c) => c.id === clipId) : null) ??
      (selectedIsVideo
        ? state.videoClips.find((c) => c.id === state.selectedTimelineClip?.clipId)
        : null) ??
      findVideoClipForPreview(
        state.videoClips,
        state.currentTime,
        videoTrackIds,
        state.timelineTrackPreviewHidden,
      );
    if (!videoClip) return null;

    // Avoid duplicate extracts for the same video clip.
    const already = state.audioClips.some((a) => a.linkedVideoClipId === videoClip.id);
    if (already) {
      const existing = state.audioClips.find((a) => a.linkedVideoClipId === videoClip.id)!;
      set({
        selectedTimelineClip: { trackId: 'audio', clipId: existing.id },
        selectedTimelineClips: [{ trackId: 'audio', clipId: existing.id }],
        selectedCanvasElementId: null,
        timelineTrackHidden: state.timelineTrackHidden.filter((id) => id !== 'audio'),
      });
      return existing.id;
    }

    const audioClip = extractAudioClipFromVideo(videoClip);
    const selection = buildTimelineSelection(
      [{ trackId: 'audio', clipId: audioClip.id }],
      { trackId: 'audio', clipId: audioClip.id },
    );
    set({
      ...pushHistory(state),
      ...withTimelineDuration(state, {
        audioClips: [...state.audioClips, audioClip],
      }),
      timelineTrackHidden: state.timelineTrackHidden.filter((id) => id !== 'audio'),
      timelineTrackOrder: state.timelineTrackOrder.includes('audio')
        ? state.timelineTrackOrder
        : [...state.timelineTrackOrder, 'audio'],
      ...selection,
      selectedCanvasElementId: null,
    });
    return audioClip.id;
  },

  detachAudioFromVideoClip: (clipId) => {
    const state = get();
    const videoTrackIds = listVideoTrackIds(
      state.extraTimelineTracks,
      state.timelineTrackOrder,
      state.timelineTrackHidden,
    );
    const selectedIsVideo =
      state.selectedTimelineClip &&
      (state.selectedTimelineClip.trackId === 'video' ||
        String(state.selectedTimelineClip.trackId).startsWith('video-'));
    const videoClip =
      (clipId ? state.videoClips.find((c) => c.id === clipId) : null) ??
      (selectedIsVideo
        ? state.videoClips.find((c) => c.id === state.selectedTimelineClip?.clipId)
        : null) ??
      findVideoClipForPreview(
        state.videoClips,
        state.currentTime,
        videoTrackIds,
        state.timelineTrackPreviewHidden,
      );
    if (!videoClip) return null;

    let audioClips = state.audioClips;
    let audioId =
      audioClips.find((a) => a.linkedVideoClipId === videoClip.id)?.id ?? null;

    if (!audioId) {
      const audioClip = extractAudioClipFromVideo(videoClip, { namePrefix: 'Detached' });
      audioClips = [...audioClips, audioClip];
      audioId = audioClip.id;
    }

    const videoClips = state.videoClips.map((c) =>
      c.id === videoClip.id ? { ...c, muted: true } : c,
    );
    const selection = buildTimelineSelection(
      [{ trackId: 'audio', clipId: audioId }],
      { trackId: 'audio', clipId: audioId },
    );
    set({
      ...pushHistory(state),
      ...withTimelineDuration(state, { videoClips, audioClips }),
      timelineTrackHidden: state.timelineTrackHidden.filter((id) => id !== 'audio'),
      timelineTrackOrder: state.timelineTrackOrder.includes('audio')
        ? state.timelineTrackOrder
        : [...state.timelineTrackOrder, 'audio'],
      ...selection,
      selectedCanvasElementId: null,
    });
    return audioId;
  },

  extractAudioFromVideoTrack: (trackId) => {
    const state = get();
    const targetTrackId = trackId ?? 'video';
    const trackVideoClips = state.videoClips.filter(
      (c) => clipTrackId(c, 'video') === targetTrackId,
    );
    if (trackVideoClips.length === 0) return [];

    let audioClips = state.audioClips;
    const resultIds: string[] = [];
    for (const videoClip of trackVideoClips) {
      const existing = audioClips.find((a) => a.linkedVideoClipId === videoClip.id);
      if (existing) {
        resultIds.push(existing.id);
        continue;
      }
      const audioClip = extractAudioClipFromVideo(videoClip);
      audioClips = [...audioClips, audioClip];
      resultIds.push(audioClip.id);
    }

    const lastId = resultIds[resultIds.length - 1] ?? null;
    const selection = lastId
      ? buildTimelineSelection(
          [{ trackId: 'audio', clipId: lastId }],
          { trackId: 'audio', clipId: lastId },
        )
      : {};

    set({
      ...pushHistory(state),
      ...withTimelineDuration(state, { audioClips }),
      timelineTrackHidden: state.timelineTrackHidden.filter((id) => id !== 'audio'),
      timelineTrackOrder: state.timelineTrackOrder.includes('audio')
        ? state.timelineTrackOrder
        : [...state.timelineTrackOrder, 'audio'],
      ...selection,
      selectedCanvasElementId: null,
    });
    return resultIds;
  },

  detachAudioFromVideoTrack: (trackId) => {
    const state = get();
    const targetTrackId = trackId ?? 'video';
    const trackVideoClips = state.videoClips.filter(
      (c) => clipTrackId(c, 'video') === targetTrackId,
    );
    if (trackVideoClips.length === 0) return [];

    let audioClips = state.audioClips;
    const mutedIds = new Set<string>();
    const resultIds: string[] = [];
    for (const videoClip of trackVideoClips) {
      let existing = audioClips.find((a) => a.linkedVideoClipId === videoClip.id);
      if (!existing) {
        existing = extractAudioClipFromVideo(videoClip, { namePrefix: 'Detached' });
        audioClips = [...audioClips, existing];
      }
      resultIds.push(existing.id);
      mutedIds.add(videoClip.id);
    }

    const videoClips = state.videoClips.map((c) =>
      mutedIds.has(c.id) ? { ...c, muted: true } : c,
    );

    const lastId = resultIds[resultIds.length - 1] ?? null;
    const selection = lastId
      ? buildTimelineSelection(
          [{ trackId: 'audio', clipId: lastId }],
          { trackId: 'audio', clipId: lastId },
        )
      : {};

    set({
      ...pushHistory(state),
      ...withTimelineDuration(state, { videoClips, audioClips }),
      timelineTrackHidden: state.timelineTrackHidden.filter((id) => id !== 'audio'),
      timelineTrackOrder: state.timelineTrackOrder.includes('audio')
        ? state.timelineTrackOrder
        : [...state.timelineTrackOrder, 'audio'],
      ...selection,
      selectedCanvasElementId: null,
    });
    return resultIds;
  },

  applyStudioTemplate: (templateId, bindings = []) => {
    const template = getStudioTemplate(templateId);
    if (!template) return;
    const state = get();
    const applied = instantiateStudioTemplate(template, bindings);
    set({
      ...pushHistory(state),
      aspectRatio: applied.aspectRatio,
      canvasElements: applied.canvasElements as CanvasElement[],
      videoClips: applied.videoClips as MediaClip[],
      audioClips: applied.audioClips as MediaClip[],
      duration: applied.duration,
      activeStudioTemplateId: templateId,
      pendingTemplateSlotIds: applied.unfilledSlotIds,
      ...buildTimelineSelection([]),
      selectedCanvasElementId: null,
      activeStudioTool: 'text',
      toolsDrawerOpen: true,
      isTimelinePlaying: false,
    });
  },

  clearStudioTemplate: () =>
    set({
      activeStudioTemplateId: null,
      pendingTemplateSlotIds: [],
    }),

  initSpeakersFromTranscript: (text) => {
    const speakers = extractSpeakers(text);
    const initialVoices: Record<string, string> = {};
    speakers.forEach((s, i) => {
      initialVoices[s] = VOICES[i % VOICES.length].id;
    });
    set({ detectedSpeakers: speakers, speakerVoices: initialVoices });
  },

  setBeatAnalysis: (analysis) => set({ beatAnalysis: analysis }),

  setAutoCutSuggestions: (suggestions) => set({ autoCutSuggestions: suggestions }),

  setShowBeatMarkers: (show) => set({ showBeatMarkers: show }),

  setBeatSensitivity: (sensitivity) =>
    set({ beatSensitivity: Math.min(1, Math.max(0, sensitivity)) }),

  setAutoCutDensity: (density) => set({ autoCutDensity: density }),

  clearBeatAnalysis: () =>
    set({ beatAnalysis: null, autoCutSuggestions: [], showBeatMarkers: true }),

  applyAutoCutSuggestions: () => {
    const state = get();
    const times = state.autoCutSuggestions.map((s) => s.timeSec);
    if (!times.length) return;

    const result = applyMediaSplitsAtTimes(
      {
        currentTime: state.currentTime,
        duration: state.duration,
        transcript: state.transcript,
        translatedText: state.translatedText,
        status: state.status,
        videoClips: state.videoClips,
        audioClips: state.audioClips,
        canvasElements: state.canvasElements,
        selectedTimelineClip: state.selectedTimelineClip,
      },
      times,
    );
    if (!result) return;

    set({
      ...pushHistory(state),
      ...withTimelineDuration(state, {
        videoClips: result.videoClips ?? state.videoClips,
        audioClips: result.audioClips ?? state.audioClips,
      }),
      selectedTimelineClip: result.selectedTimelineClip,
      selectedTimelineClips: result.selectedTimelineClips,
      selectedCanvasElementId: result.selectedCanvasElementId,
      autoCutSuggestions: [],
    });
  },
}));
