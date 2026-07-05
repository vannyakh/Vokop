import { useCallback } from 'react';
import { useAppStore } from '@/features/project';
import { fileToBase64 } from '@/lib/utils/file';
import {
  transcribeVideo,
  translateSegmentsForEditor,
  translateText,
  generateSpeech,
  generateMultiSpeakerSpeech,
  generateVoiceoverForEditor,
  analyzeVideo,
  retranslateSegment,
} from '@/features/translation/services/studioAi';
import { fromApiCaptionSegments, captionSegmentsToTranscript } from '@vokop/shared';

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

  const openEditorAfterProcess = useCallback(() => {
    store.setEditorOpen(true);
    store.setActiveTab('translate');
    store.setActiveStudioTool('text');
    store.setToolsDrawerOpen(true);
  }, [store]);

  const processAll = useCallback(async () => {
    const { videoFile, targetLang, selectedVoice, speakerVoices, duration, aspectRatio } =
      useAppStore.getState();
    if (!videoFile) return;

    try {
      store.setStatus('transcribing');
      store.setErrorMessage('');
      const base64 = await fileToBase64(videoFile);

      const transcriptionResult = await transcribeVideo(
        base64,
        videoFile.type,
        duration > 0 ? duration : undefined,
        useAppStore.getState().videoSessionId,
      );

      store.setDetectedLanguage(transcriptionResult.detectedLanguage);
      const transcriptSegments = fromApiCaptionSegments(
        transcriptionResult.segments.map((s) => ({
          startSec: s.startSec,
          endSec: s.endSec,
          text: s.text,
          speakerId: s.speaker,
          words: s.words,
        })),
      );
      const transcript =
        transcriptionResult.transcript || captionSegmentsToTranscript(transcriptSegments);
      store.setCaptionTracks('transcript', transcriptSegments);
      store.setTranscript(transcript);
      store.initSpeakersFromTranscript(transcript);

      store.setStatus('analyzing');
      const analysis = await analyzeVideo(base64, videoFile.type, targetLang);
      store.setVideoAnalysis(analysis);

      store.setStatus('translating');
      const translationResult = await translateSegmentsForEditor(
        transcriptionResult.segments,
        targetLang,
        transcriptionResult.detectedLanguage,
        aspectRatio,
      );
      const translatedSegments = fromApiCaptionSegments(
        translationResult.segments.map((s) => ({
          startSec: s.startSec,
          endSec: s.endSec,
          text: s.text,
          speakerId: s.speaker,
          words: s.words,
        })),
      );
      const translatedText =
        translationResult.translatedText || captionSegmentsToTranscript(translatedSegments);
      store.setCaptionTracks('translation', translatedSegments);
      store.setTranslatedText(translatedText);

      store.setStatus('speaking');
      const voices = useAppStore.getState().speakerVoices;
      const audio = await generateVoiceoverForEditor(translationResult.translatedText, voices);
      store.setAudioBase64(audio);

      if (analysis?.summary) {
        const summaryAudio = await generateSpeech(analysis.summary, selectedVoice);
        store.setAnalysisAudio(summaryAudio);
      }

      if (analysis?.highlights) {
        await cacheReelAudio(analysis.highlights);
      }

      store.setStatus('idle');
      openEditorAfterProcess();
    } catch (error: unknown) {
      console.error(error);
      store.setStatus('error');
      store.setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred.');
    }
  }, [store, cacheReelAudio, openEditorAfterProcess]);

  const regenerateVoiceover = useCallback(async () => {
    const { translatedText, speakerVoices } = useAppStore.getState();
    if (!translatedText.trim()) return;

    try {
      store.setStatus('speaking');
      store.setErrorMessage('');
      const audio = await generateVoiceoverForEditor(translatedText, speakerVoices);
      store.setAudioBase64(audio);
      store.setStatus('idle');
    } catch (error: unknown) {
      console.error(error);
      store.setStatus('error');
      store.setErrorMessage(error instanceof Error ? error.message : 'Voice regeneration failed.');
    }
  }, [store]);

  const retranslateActiveSegment = useCallback(
    async (segmentIndex: number) => {
      const { transcript, targetLang, detectedLanguage, aspectRatio } = useAppStore.getState();
      const lines = transcript.split('\n').filter(Boolean);
      const line = lines[segmentIndex];
      if (!line) return;

      const match = line.match(/\[(\d{2}):(\d{2})\]\s+([^:]+):\s+(.*)/);
      if (!match) return;

      const segment = {
        startSec: parseInt(match[1], 10) * 60 + parseInt(match[2], 10),
        speaker: match[3].trim(),
        text: match[4].trim(),
      };

      try {
        store.setStatus('translating');
        const translatedLine = await retranslateSegment(
          segment,
          targetLang,
          detectedLanguage ?? undefined,
          aspectRatio,
        );
        store.updateSegment(segmentIndex, translatedLine, 'translation');
        store.setStatus('idle');
      } catch (error: unknown) {
        console.error(error);
        store.setStatus('error');
        store.setErrorMessage(error instanceof Error ? error.message : 'Retranslation failed.');
      }
    },
    [store],
  );

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

  return {
    processAll,
    previewVoice,
    cacheReelAudio,
    regenerateVoiceover,
    retranslateActiveSegment,
    translateText,
  };
}
