import type { CaptionSegment } from '@vokop/shared';
import { captionSegmentsToTranscript } from '@vokop/shared';
import { useAppStore } from '@/features/project';
import { importSubtitleCuesToCaptionSegments } from '@/features/studio/lib/captionChunking';
import { readSubtitleFile } from '@/features/studio/lib/subtitles';

const SUBTITLE_EXTENSIONS = new Set(['srt', 'ass', 'ssa']);

export function isSubtitleFileName(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return SUBTITLE_EXTENSIONS.has(ext);
}

export function isSubtitleFile(file: File): boolean {
  return isSubtitleFileName(file.name);
}

export function getSubtitleFiles(files: FileList | File[] | undefined): File[] {
  if (!files?.length) return [];
  return Array.from(files).filter(isSubtitleFile);
}

function offsetCaptionSegments(segments: CaptionSegment[], offsetSec: number): CaptionSegment[] {
  if (Math.abs(offsetSec) < 1e-4) return segments;
  return segments.map((segment) => ({
    ...segment,
    startSec: Math.max(0, segment.startSec + offsetSec),
    endSec: Math.max(0, segment.endSec + offsetSec),
    words: segment.words?.map((word) => ({
      ...word,
      startSec: Math.max(0, word.startSec + offsetSec),
      endSec: Math.max(0, word.endSec + offsetSec),
    })),
  }));
}

export interface ImportSubtitlesResult {
  segments: CaptionSegment[];
  warnings: string[];
}

/** Parse SRT/ASS, optionally align first cue to `alignStartSec`, and load into caption tracks. */
export async function importSubtitlesToProject(input: {
  file: File;
  track?: 'transcript' | 'translation';
  alignStartSec?: number;
}): Promise<ImportSubtitlesResult> {
  const track = input.track ?? 'transcript';
  const parsed = await readSubtitleFile(input.file);
  let segments = importSubtitleCuesToCaptionSegments(parsed.captions);
  if (segments.length === 0) {
    throw new Error('No subtitle cues found in file.');
  }

  if (input.alignStartSec != null) {
    const offset = input.alignStartSec - segments[0]!.startSec;
    segments = offsetCaptionSegments(segments, offset);
  }

  const store = useAppStore.getState();
  store.setCaptionTracks(track, segments);
  const serialized = captionSegmentsToTranscript(segments);
  if (track === 'transcript') {
    store.setTranscript(serialized);
  } else {
    store.setTranslatedText(serialized);
  }

  const warnings = [...parsed.warnings];
  if (parsed.skippedCueCount > 0) {
    warnings.push(`Skipped ${parsed.skippedCueCount} invalid cue(s).`);
  }

  return { segments, warnings };
}
