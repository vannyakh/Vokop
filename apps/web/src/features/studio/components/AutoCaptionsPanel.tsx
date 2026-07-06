import { Loader2, Sparkles, Subtitles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useAutoCaptions } from '@/features/studio/hooks/useAutoCaptions';
import { CaptionWordEditor } from '@/features/studio/components/CaptionWordEditor';

export function AutoCaptionsPanel() {
  const videoFile = useAppStore((s) => s.videoFile);
  const captionTracks = useAppStore((s) => s.captionTracks);
  const promoteCaptionTrackToCanvas = useAppStore((s) => s.promoteCaptionTrackToCanvas);
  const { generateCaptions, generateCaptionsAndTranslate, progress, error, isBusy } =
    useAutoCaptions();

  const hasCaptions =
    captionTracks.transcript.length > 0 || captionTracks.translation.length > 0;
  const wordCount =
    captionTracks.translation.reduce((sum, s) => sum + (s.words?.length ?? 0), 0) ||
    captionTracks.transcript.reduce((sum, s) => sum + (s.words?.length ?? 0), 0);

  return (
    <div className="studio-auto-captions">
      <p className="studio-auto-captions-desc">
        Generate speech-to-text captions with word-level timing. Edit words and timing after
        generation.
      </p>

      {!videoFile && (
        <p className="studio-auto-captions-hint">Upload or add a video to generate captions.</p>
      )}

      <div className="studio-auto-captions-actions">
        <button
          type="button"
          className="studio-tools-action-btn w-full"
          disabled={!videoFile || isBusy}
          onClick={() => void generateCaptions()}
        >
          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Subtitles size={14} />}
          Generate captions
        </button>
        <button
          type="button"
          className={cn('studio-tools-action-btn w-full', 'studio-tools-action-btn--secondary')}
          disabled={!videoFile || isBusy}
          onClick={() => void generateCaptionsAndTranslate()}
        >
          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Captions + translate
        </button>
      </div>

      {progress && (
        <p className="studio-auto-captions-progress" aria-live="polite">
          {progress}
        </p>
      )}
      {error && <p className="studio-auto-captions-error">{error}</p>}

      {hasCaptions && (
        <div className="studio-auto-captions-stats">
          <span>
            {captionTracks.translation.length || captionTracks.transcript.length} segments
          </span>
          {wordCount > 0 && <span>{wordCount} words timed</span>}
        </div>
      )}

      {hasCaptions && (
        <div className="studio-auto-captions-actions">
          {captionTracks.transcript.length > 0 && (
            <button
              type="button"
              className="studio-tools-action-btn w-full studio-tools-action-btn--secondary"
              onClick={() => promoteCaptionTrackToCanvas('transcript')}
            >
              Promote transcript to canvas text
            </button>
          )}
          {captionTracks.translation.length > 0 && (
            <button
              type="button"
              className="studio-tools-action-btn w-full studio-tools-action-btn--secondary"
              onClick={() => promoteCaptionTrackToCanvas('translation')}
            >
              Promote translation to canvas text
            </button>
          )}
        </div>
      )}

      <CaptionWordEditor />
    </div>
  );
}
