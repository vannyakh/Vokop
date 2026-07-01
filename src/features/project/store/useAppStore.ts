import { create } from 'zustand';
import type { EditorTab, ProcessingStatus, VideoAnalysis, AspectRatioId, StudioToolId } from '@/types';
import { DEFAULT_VOICE, VOICES } from '@/features/translation/constants/voices';
import { extractSpeakers } from '@/lib/utils/transcript';
import { updateSegmentText, parseSegments, updateSegmentTime, updateSegmentDuration, removeSegment, addSegmentAtTime, splitSegmentAtTime, getSegmentIndexAtTime } from '@/lib/utils/transcript';
import type { TimelineTrackId } from '@/features/studio/lib/timelineTypes';
import type { CanvasElement, CanvasTool } from '@/types/canvas';
import { defaultProjectName, detectAspectRatioId } from '@/features/studio/constants/aspectRatios';
import { cloneCanvasElements, pushCanvasUndoStack } from '@/features/studio/lib/canvasHistory';

function pushCanvasUndo(state: { canvasElements: CanvasElement[]; canvasUndoStack: CanvasElement[][] }) {
  return {
    canvasUndoStack: pushCanvasUndoStack(state.canvasUndoStack, state.canvasElements),
    canvasRedoStack: [] as CanvasElement[][],
  };
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
  projectName: string;
  aspectRatio: AspectRatioId;
  videoWidth: number;
  videoHeight: number;
  captionPosition: { x: number; y: number } | null;
  toolsDrawerOpen: boolean;
  activeStudioTool: StudioToolId;
  timelineZoom: number;
  timelineTrackMuted: Record<TimelineTrackId, boolean>;
  selectedTimelineClip: { trackId: TimelineTrackId; clipId: string } | null;
  canvasElements: CanvasElement[];
  selectedCanvasElementId: string | null;
  canvasTool: CanvasTool;
  canvasUndoStack: CanvasElement[][];
  canvasRedoStack: CanvasElement[][];

  setVideo: (file: File, url: string) => void;
  resetProject: () => void;
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
  setDuration: (duration: number) => void;
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
  setTimelineZoom: (zoom: number) => void;
  toggleTimelineTrackMuted: (trackId: TimelineTrackId) => void;
  setSelectedTimelineClip: (clip: { trackId: TimelineTrackId; clipId: string } | null) => void;
  updateSegment: (index: number, newText: string, type: 'transcript' | 'translation') => void;
  updateSegmentTime: (index: number, newTime: number, type: 'transcript' | 'translation') => void;
  updateSegmentDuration: (index: number, duration: number, type: 'transcript' | 'translation') => void;
  removeTimelineClip: (trackId: TimelineTrackId, clipId: string) => void;
  addTimelineClip: (trackId: TimelineTrackId, time: number) => void;
  setCanvasElements: (elements: CanvasElement[]) => void;
  setCanvasTool: (tool: CanvasTool) => void;
  setSelectedCanvasElementId: (id: string | null) => void;
  selectCanvasElement: (id: string | null) => void;
  updateCanvasElement: (id: string, patch: Partial<CanvasElement>) => void;
  addCanvasLogo: (file: File) => void;
  addCanvasImageOverlay: (file: File) => void;
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
  status: 'idle' as ProcessingStatus,
  errorMessage: '',
  isExporting: false,
  sidebarOpen: true,
  editorOpen: true,
  activeTab: 'translate' as EditorTab,
  projectName: '',
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
    overlay: false,
    audio: false,
  } as Record<TimelineTrackId, boolean>,
  selectedTimelineClip: null as { trackId: TimelineTrackId; clipId: string } | null,
  canvasElements: [] as CanvasElement[],
  selectedCanvasElementId: null as string | null,
  canvasTool: 'select' as CanvasTool,
  canvasUndoStack: [] as CanvasElement[][],
  canvasRedoStack: [] as CanvasElement[][],
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setVideo: (file, url) => {
    const prevUrl = get().videoUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    set({
      videoFile: file,
      videoUrl: url,
      projectName: defaultProjectName(file.name),
      aspectRatio: 'original',
      videoWidth: 0,
      videoHeight: 0,
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
      timelineZoom: 100,
      timelineTrackMuted: { video: false, text: false, overlay: false, audio: false },
      selectedTimelineClip: null,
      canvasElements: [],
      selectedCanvasElementId: null,
      canvasTool: 'select',
      canvasUndoStack: [],
      canvasRedoStack: [],
    });
  },

  resetProject: () => {
    const prevUrl = get().videoUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    set({ ...initialState });
  },

  setTranscript: (text) => set({ transcript: text }),
  setTranslatedText: (text) => set({ translatedText: text }),
  setTargetLang: (lang) => set({ targetLang: lang }),
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),
  setSpeakerVoices: (voices) => set({ speakerVoices: voices }),
  updateSpeakerVoice: (speaker, voiceId) =>
    set((s) => ({ speakerVoices: { ...s.speakerVoices, [speaker]: voiceId } })),
  setAudioBase64: (audio) => set({ audioBase64: audio }),
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
  setDuration: (duration) => set({ duration }),
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

  setTimelineZoom: (zoom) => set({ timelineZoom: Math.min(400, Math.max(25, zoom)) }),
  toggleTimelineTrackMuted: (trackId) =>
    set((s) => ({
      timelineTrackMuted: { ...s.timelineTrackMuted, [trackId]: !s.timelineTrackMuted[trackId] },
    })),
  setSelectedTimelineClip: (clip) => set({ selectedTimelineClip: clip }),

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
    if (clipId.startsWith('logo-') || clipId.startsWith('image-')) {
      get().removeCanvasElement(clipId);
      return;
    }

    const meta = clipId.match(/^(translation|transcript)-(\d+)$/);
    if (!meta) return;
    const type = meta[1] as 'translation' | 'transcript';
    const index = parseInt(meta[2], 10);
    const state = get();
    if (type === 'transcript') {
      const segments = parseSegments(state.transcript);
      set({ transcript: removeSegment(segments, index), selectedTimelineClip: null });
    } else {
      const segments = parseSegments(state.translatedText);
      set({ translatedText: removeSegment(segments, index), selectedTimelineClip: null });
    }
  },

  addTimelineClip: (trackId, time) => {
    const state = get();
    if (trackId === 'text') {
      const segments = parseSegments(state.translatedText);
      set({
        translatedText: addSegmentAtTime(segments, time, 'Speaker', 'New caption'),
        selectedTimelineClip: null,
      });
    } else if (trackId === 'overlay') {
      const segments = parseSegments(state.transcript);
      set({
        transcript: addSegmentAtTime(segments, time, 'Speaker', 'New line'),
        selectedTimelineClip: null,
      });
    }
  },

  setCanvasElements: (elements) => set({ canvasElements: elements }),
  setCanvasTool: (tool) => set({ canvasTool: tool }),
  setSelectedCanvasElementId: (id) => set({ selectedCanvasElementId: id }),
  selectCanvasElement: (id) => {
    const element = id ? get().canvasElements.find((el) => el.id === id) : null;
    const tool: StudioToolId =
      element?.type === 'logo' || element?.type === 'image' ? 'media' : 'text';

    let selectedTimelineClip: { trackId: TimelineTrackId; clipId: string } | null = null;
    if (element) {
      if (element.segmentType === 'translation') {
        selectedTimelineClip = { trackId: 'text', clipId: element.id };
      } else if (element.segmentType === 'transcript' || element.type === 'logo' || element.type === 'image') {
        selectedTimelineClip = { trackId: 'overlay', clipId: element.id };
      }
    }

    set({
      selectedCanvasElementId: id,
      selectedTimelineClip: id ? selectedTimelineClip : null,
      ...(id ? { activeStudioTool: tool, toolsDrawerOpen: true } : {}),
    });
  },
  updateCanvasElement: (id, patch) => {
    const state = get();
    const element = state.canvasElements.find((el) => el.id === id);
    if (!element) return;

    const nextElements = state.canvasElements.map((el) => (el.id === id ? { ...el, ...patch } : el));
    const updates: Partial<typeof initialState> & {
      canvasElements: CanvasElement[];
      canvasUndoStack: CanvasElement[][];
      canvasRedoStack: CanvasElement[][];
    } = {
      canvasElements: nextElements,
      ...pushCanvasUndo(state),
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
      ...pushCanvasUndo(state),
      canvasElements: [...state.canvasElements, element],
      selectedCanvasElementId: id,
      activeStudioTool: 'media',
      toolsDrawerOpen: true,
    });
  },

  addCanvasImageOverlay: (file) => {
    const state = get();
    const url = URL.createObjectURL(file);
    const id = `image-${Date.now()}`;
    const duration = state.duration || 3600;
    const element: CanvasElement = {
      id,
      type: 'image',
      text: file.name,
      src: url,
      x: Math.max(24, state.videoWidth ? 48 : 24),
      y: Math.max(24, state.videoHeight ? 48 : 24),
      width: 200,
      height: 120,
      fontSize: 0,
      rotation: 0,
      opacity: 0.85,
      startTime: 0,
      endTime: duration,
    };
    set({
      ...pushCanvasUndo(state),
      canvasElements: [...state.canvasElements, element],
      selectedCanvasElementId: id,
      activeStudioTool: 'media',
      toolsDrawerOpen: true,
    });
  },

  removeCanvasElement: (id) => {
    const state = get();
    const element = state.canvasElements.find((el) => el.id === id);
    if (element?.src) URL.revokeObjectURL(element.src);
    set({
      ...pushCanvasUndo(state),
      canvasElements: state.canvasElements.filter((el) => el.id !== id),
      selectedCanvasElementId: state.selectedCanvasElementId === id ? null : state.selectedCanvasElementId,
    });
  },

  undoCanvas: () => {
    const state = get();
    if (state.canvasUndoStack.length === 0) return;
    const previous = state.canvasUndoStack[state.canvasUndoStack.length - 1];
    set({
      canvasUndoStack: state.canvasUndoStack.slice(0, -1),
      canvasRedoStack: pushCanvasUndoStack(state.canvasRedoStack, state.canvasElements),
      canvasElements: cloneCanvasElements(previous),
    });
  },

  redoCanvas: () => {
    const state = get();
    if (state.canvasRedoStack.length === 0) return;
    const next = state.canvasRedoStack[state.canvasRedoStack.length - 1];
    set({
      canvasRedoStack: state.canvasRedoStack.slice(0, -1),
      canvasUndoStack: pushCanvasUndoStack(state.canvasUndoStack, state.canvasElements),
      canvasElements: cloneCanvasElements(next),
    });
  },

  splitTimelineAtPlayhead: () => {
    const state = get();
    const { currentTime, duration, selectedTimelineClip } = state;
    if (!duration) return;

    const trackId = selectedTimelineClip?.trackId ?? 'text';
    if (trackId === 'overlay' && selectedTimelineClip?.clipId.startsWith('logo-')) return;
    if (trackId === 'overlay' && selectedTimelineClip?.clipId.startsWith('image-')) return;

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

    if (type === 'transcript') set({ transcript: next });
    else set({ translatedText: next });
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
