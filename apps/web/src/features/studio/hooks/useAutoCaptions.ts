import { useCallback, useState } from 'react';
import { useAppStore } from '@/features/project';
import { fileToBase64 } from '@/lib/utils/file';
import {
  captionSegmentsToTranscript,
  fromApiCaptionSegments,
  type CaptionSegment,
} from '@vokop/shared';
import { transcribeVideo, translateSegmentsForEditor } from '@/features/translation/services/studioAi';
import { editorSegmentsToTranscript } from '@/features/translation/services/editorFormat';
import { chunkCaptionSegments } from '@/features/studio/lib/captionChunking';

export function useAutoCaptions() {
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyCaptionResult = useCallback(
    (segments: CaptionSegment[], transcript: string, detectedLanguage?: string) => {
      const store = useAppStore.getState();
      store.setCaptionTracks('transcript', segments);
      store.setTranscript(transcript);
      if (detectedLanguage) store.setDetectedLanguage(detectedLanguage);
      store.initSpeakersFromTranscript(transcript);
    },
    [],
  );

  const generateCaptions = useCallback(async () => {
    const { videoFile, duration, videoSessionId } = useAppStore.getState();
    if (!videoFile) {
      setError('Upload a video first.');
      return;
    }

    setError(null);
    setProgress('Transcribing speech…');

    try {
      const base64 = await fileToBase64(videoFile);
      const result = await transcribeVideo(
        base64,
        videoFile.type,
        duration > 0 ? duration : undefined,
        videoSessionId,
      );
      const segments = chunkCaptionSegments(
        fromApiCaptionSegments(
          result.segments.map((s) => ({
            startSec: s.startSec,
            endSec: s.endSec,
            text: s.text,
            speakerId: s.speaker,
            words: s.words,
          })),
        ),
      );
      const transcript = result.transcript || captionSegmentsToTranscript(segments);
      applyCaptionResult(segments, transcript, result.detectedLanguage);
      setProgress(null);
      return segments;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Caption generation failed';
      setError(message);
      setProgress(null);
      throw err;
    }
  }, [applyCaptionResult]);

  const generateCaptionsAndTranslate = useCallback(async () => {
    const state = useAppStore.getState();
    const { videoFile, targetLang, aspectRatio, duration, videoSessionId } = state;
    if (!videoFile) {
      setError('Upload a video first.');
      return;
    }

    setError(null);
    setProgress('Transcribing speech…');

    try {
      const base64 = await fileToBase64(videoFile);
      const transcription = await transcribeVideo(
        base64,
        videoFile.type,
        duration > 0 ? duration : undefined,
        videoSessionId,
      );

      const sourceSegments = chunkCaptionSegments(
        fromApiCaptionSegments(
          transcription.segments.map((s) => ({
            startSec: s.startSec,
            endSec: s.endSec,
            text: s.text,
            speakerId: s.speaker,
            words: s.words,
          })),
        ),
      );
      const transcript =
        transcription.transcript || captionSegmentsToTranscript(sourceSegments);
      applyCaptionResult(sourceSegments, transcript, transcription.detectedLanguage);

      setProgress('Translating captions…');
      const translation = await translateSegmentsForEditor(
        transcription.segments,
        targetLang,
        transcription.detectedLanguage,
        aspectRatio,
      );

      const translatedSegments = chunkCaptionSegments(
        fromApiCaptionSegments(
          translation.segments.map((s) => ({
            startSec: s.startSec,
            endSec: s.endSec,
            text: s.text,
            speakerId: s.speaker,
            words: s.words,
          })),
        ),
      );
      const translatedText =
        translation.translatedText || editorSegmentsToTranscript(translation.segments);

      useAppStore.getState().setCaptionTracks('translation', translatedSegments);
      useAppStore.getState().setTranslatedText(translatedText);
      setProgress(null);
      return translatedSegments;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Caption generation failed';
      setError(message);
      setProgress(null);
      throw err;
    }
  }, [applyCaptionResult]);

  return {
    generateCaptions,
    generateCaptionsAndTranslate,
    progress,
    error,
    isBusy: progress != null,
  };
};
