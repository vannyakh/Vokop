import { useCallback } from 'react';
import { useAppStore } from '@/features/project';
import { fileToBase64 } from '@/lib/utils/file';
import {
  transcribeVideo,
  translateText,
  generateSpeech,
  generateMultiSpeakerSpeech,
  analyzeVideo,
} from '@/features/translation/services/gemini';

export function useVideoProcessing() {
  const store = useAppStore();

  const cacheReelAudio = useCallback(
    async (highlights: { narration: string }[]) => {
      const cache: Record<number, string> = {};
      for (let i = 0; i < highlights.length; i++) {
        try {
          cache[i] = await generateSpeech(highlights[i].narration, store.selectedVoice);
        } catch (err) {
          console.warn(`Failed to pre-cache audio for highlight ${i}:`, err);
        }
      }
      store.setReelAudioCache(cache);
    },
    [store],
  );

  const processAll = useCallback(async () => {
    const { videoFile, targetLang, selectedVoice, speakerVoices } = useAppStore.getState();
    if (!videoFile) return;

    try {
      store.setStatus('transcribing');
      const base64 = await fileToBase64(videoFile);
      const transcriptionResult = await transcribeVideo(base64, videoFile.type);
      const text = transcriptionResult.transcript;

      store.setDetectedLanguage(transcriptionResult.detectedLanguage);
      store.setTranscript(text || 'No transcript generated.');
      store.initSpeakersFromTranscript(text || '');

      store.setStatus('analyzing');
      const analysis = await analyzeVideo(base64, videoFile.type, targetLang);
      store.setVideoAnalysis(analysis);

      store.setStatus('translating');
      const translated = await translateText(text || '', targetLang, transcriptionResult.detectedLanguage);
      store.setTranslatedText(translated || '');

      store.setStatus('speaking');
      const voices = useAppStore.getState().speakerVoices;
      const audio = await generateMultiSpeakerSpeech(translated || '', voices);
      store.setAudioBase64(audio);

      if (analysis?.summary) {
        const summaryAudio = await generateSpeech(analysis.summary, selectedVoice);
        store.setAnalysisAudio(summaryAudio);
      }

      if (analysis?.highlights) {
        await cacheReelAudio(analysis.highlights);
      }

      store.setStatus('idle');
    } catch (error: unknown) {
      console.error(error);
      store.setStatus('error');
      store.setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred.');
    }
  }, [store, cacheReelAudio]);

  const previewVoice = useCallback(
    async (speaker: string, playSegment: (base64: string, cb: (p: boolean) => void) => Promise<void>) => {
      const { speakerVoices, targetLang } = useAppStore.getState();
      const voiceId = speakerVoices[speaker] || 'Kore';
      store.setPreviewingSpeaker(speaker);

      try {
        const sampleText =
          targetLang === 'Khmer'
            ? 'សួស្តី នេះគឺជាការសាកល្បងសំឡេងរបស់ខ្ញុំ។'
            : 'Hello, this is a sample of my voice.';
        const audio = await generateSpeech(sampleText, voiceId);
        await playSegment(audio, (playing) => {
          if (!playing) store.setPreviewingSpeaker(null);
        });
      } catch (error) {
        console.error('Error previewing voice:', error);
        store.setPreviewingSpeaker(null);
      }
    },
    [store],
  );

  return { processAll, previewVoice, cacheReelAudio };
}
