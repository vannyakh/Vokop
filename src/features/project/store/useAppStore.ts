import { create } from 'zustand';
import type { EditorTab, ProcessingStatus, VideoAnalysis } from '@/types';
import { DEFAULT_VOICE, VOICES } from '@/features/translation/constants/voices';
import { extractSpeakers } from '@/lib/utils/transcript';
import { updateSegmentText, parseSegments } from '@/lib/utils/transcript';

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
  updateSegment: (index: number, newText: string, type: 'transcript' | 'translation') => void;
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
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setVideo: (file, url) => {
    const prevUrl = get().videoUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    set({
      videoFile: file,
      videoUrl: url,
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

  initSpeakersFromTranscript: (text) => {
    const speakers = extractSpeakers(text);
    const initialVoices: Record<string, string> = {};
    speakers.forEach((s, i) => {
      initialVoices[s] = VOICES[i % VOICES.length].id;
    });
    set({ detectedSpeakers: speakers, speakerVoices: initialVoices });
  },
}));
