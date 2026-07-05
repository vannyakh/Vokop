import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useSegments } from '@/features/translation/hooks/useSegments';
import { formatDuration } from '@/lib/utils/time';
import { getActiveCaptionWordIndex } from '@vokop/shared';

export function CaptionWordEditor() {
  const currentTime = useAppStore((s) => s.currentTime);
  const updateCaptionWord = useAppStore((s) => s.updateCaptionWord);
  const seekTimeline = useAppStore((s) => s.seekTimeline);
  const { activeSegmentIndex, captionTracks } = useSegments();

  const trackType =
    captionTracks.translation.length > 0
      ? ('translation' as const)
      : captionTracks.transcript.length > 0
        ? ('transcript' as const)
        : null;

  const segments = trackType ? captionTracks[trackType] : [];
  const activeSegment = activeSegmentIndex >= 0 ? segments[activeSegmentIndex] : null;
  const activeWordIndex = useMemo(
    () => getActiveCaptionWordIndex(activeSegment?.words, currentTime),
    [activeSegment?.words, currentTime],
  );

  if (!trackType || !activeSegment?.words?.length) {
    return (
      <div className="studio-caption-word-editor studio-caption-word-editor--empty">
        <p className="studio-caption-word-editor-empty">
          Select a caption segment on the timeline to edit word timing.
        </p>
      </div>
    );
  }

  return (
    <div className="studio-caption-word-editor">
      <div className="studio-caption-word-editor-head">
        <span className="studio-caption-word-editor-label">Word timing</span>
        <span className="studio-caption-word-editor-range">
          {formatDuration(activeSegment.startSec)} – {formatDuration(activeSegment.endSec)}
        </span>
      </div>

      <div className="studio-caption-word-list">
        {activeSegment.words.map((word, wordIndex) => (
          <div
            key={`${word.text}-${wordIndex}`}
            className={cn(
              'studio-caption-word-row',
              activeWordIndex === wordIndex && 'is-active',
            )}
          >
            <button
              type="button"
              className="studio-caption-word-chip"
              onClick={() => seekTimeline(word.startSec)}
            >
              {word.text}
            </button>
            <label className="studio-caption-word-field">
              <span>In</span>
              <input
                type="number"
                step="0.05"
                min={0}
                value={Number(word.startSec.toFixed(2))}
                onChange={(e) =>
                  updateCaptionWord(activeSegmentIndex, wordIndex, {
                    startSec: Number(e.target.value),
                  }, trackType)
                }
              />
            </label>
            <label className="studio-caption-word-field">
              <span>Out</span>
              <input
                type="number"
                step="0.05"
                min={0}
                value={Number(word.endSec.toFixed(2))}
                onChange={(e) =>
                  updateCaptionWord(activeSegmentIndex, wordIndex, {
                    endSec: Number(e.target.value),
                  }, trackType)
                }
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
