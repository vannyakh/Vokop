import { useCallback, useState } from 'react';
import {
  clipRangesForAutoCut,
  detectBeatsFromPeaks,
  suggestAutoCuts,
  type AutoCutDensity,
  type BeatAnalysis,
} from '@vokop/shared';
import { useAppStore } from '@/features/project';
import { extractPeaksFromFile } from '@/features/studio/lib/audioPeaks';
import { getMediaFile } from '@/features/studio/lib/mediaLibrary';

export function useBeatDetection() {
  const videoFile = useAppStore((s) => s.videoFile);
  const mediaAssets = useAppStore((s) => s.mediaAssets);
  const videoClips = useAppStore((s) => s.videoClips);
  const setBeatAnalysis = useAppStore((s) => s.setBeatAnalysis);
  const setAutoCutSuggestions = useAppStore((s) => s.setAutoCutSuggestions);
  const beatSensitivity = useAppStore((s) => s.beatSensitivity);
  const autoCutDensity = useAppStore((s) => s.autoCutDensity);

  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const rebuildSuggestions = useCallback(
    (analysis: BeatAnalysis, density: AutoCutDensity = autoCutDensity) => {
      const ranges = clipRangesForAutoCut(videoClips);
      const suggestions = suggestAutoCuts(analysis, {
        density,
        clipRanges: ranges.length ? ranges : undefined,
      });
      setAutoCutSuggestions(suggestions);
      return suggestions;
    },
    [autoCutDensity, setAutoCutSuggestions, videoClips],
  );

  const analyzeFile = useCallback(
    async (file: File, source: BeatAnalysis['source']) => {
      setIsAnalyzing(true);
      setError(null);
      setProgress('Decoding audio…');
      try {
        const { peaks, durationSec } = await extractPeaksFromFile(file);
        setProgress('Detecting beats…');
        const analysis: BeatAnalysis = {
          ...detectBeatsFromPeaks(peaks, durationSec, { sensitivity: beatSensitivity }),
          source,
        };
        setBeatAnalysis(analysis);
        rebuildSuggestions(analysis);
        setProgress(null);
        return analysis;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beat analysis failed';
        setError(message);
        setProgress(null);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [beatSensitivity, rebuildSuggestions, setBeatAnalysis],
  );

  const analyzeFromVideo = useCallback(async () => {
    if (!videoFile) {
      setError('Upload a video to analyze beats.');
      return null;
    }
    return analyzeFile(videoFile, 'video');
  }, [analyzeFile, videoFile]);

  const analyzeFromMediaAsset = useCallback(
    async (assetId: string) => {
      const asset = mediaAssets.find((a) => a.id === assetId);
      const file = asset ? getMediaFile(asset.id) : null;
      if (!file) {
        setError('Media file not found.');
        return null;
      }
      const source = asset!.kind === 'audio' ? 'audio' : 'video';
      return analyzeFile(file, source);
    },
    [analyzeFile, mediaAssets],
  );

  return {
    analyzeFromVideo,
    analyzeFromMediaAsset,
    rebuildSuggestions,
    progress,
    error,
    isAnalyzing,
    clearError: () => setError(null),
  };
}
