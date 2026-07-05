import { Loader2, Music2, Scissors, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useBeatDetection } from '@/features/studio/hooks/useBeatDetection';
import type { AutoCutDensity } from '@vokop/shared';

const DENSITY_OPTIONS: { id: AutoCutDensity; label: string }[] = [
  { id: 'every-beat', label: 'Every beat' },
  { id: 'every-2', label: 'Every 2 beats' },
  { id: 'every-4', label: 'Every 4 beats' },
];

export function BeatCutPanel() {
  const videoFile = useAppStore((s) => s.videoFile);
  const beatAnalysis = useAppStore((s) => s.beatAnalysis);
  const autoCutSuggestions = useAppStore((s) => s.autoCutSuggestions);
  const showBeatMarkers = useAppStore((s) => s.showBeatMarkers);
  const beatSensitivity = useAppStore((s) => s.beatSensitivity);
  const autoCutDensity = useAppStore((s) => s.autoCutDensity);
  const setShowBeatMarkers = useAppStore((s) => s.setShowBeatMarkers);
  const setBeatSensitivity = useAppStore((s) => s.setBeatSensitivity);
  const setAutoCutDensity = useAppStore((s) => s.setAutoCutDensity);
  const clearBeatAnalysis = useAppStore((s) => s.clearBeatAnalysis);
  const applyAutoCutSuggestions = useAppStore((s) => s.applyAutoCutSuggestions);
  const seekTimeline = useAppStore((s) => s.seekTimeline);

  const { analyzeFromVideo, rebuildSuggestions, progress, error, isAnalyzing, clearError } =
    useBeatDetection();

  const handleDensityChange = (density: AutoCutDensity) => {
    setAutoCutDensity(density);
    if (beatAnalysis) rebuildSuggestions(beatAnalysis, density);
  };

  const handleSensitivityChange = (value: number) => {
    setBeatSensitivity(value);
  };

  return (
    <div className="studio-beat-cut">
      <p className="studio-beat-cut-desc">
        Detect beats in your soundtrack and get razor-cut suggestions synced to the rhythm.
      </p>

      {!videoFile && (
        <p className="studio-beat-cut-hint">Upload or add a video with audio to detect beats.</p>
      )}

      <div className="studio-beat-cut-actions">
        <button
          type="button"
          className="studio-tools-action-btn w-full"
          disabled={!videoFile || isAnalyzing}
          onClick={() => {
            clearError();
            void analyzeFromVideo();
          }}
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Music2 size={14} />}
          Detect beats
        </button>
      </div>

      {progress && (
        <p className="studio-beat-cut-progress" aria-live="polite">
          {progress}
        </p>
      )}
      {error && <p className="studio-beat-cut-error">{error}</p>}

      {beatAnalysis && (
        <>
          <div className="studio-beat-cut-stats">
            <span>{Math.round(beatAnalysis.bpm)} BPM</span>
            <span>{beatAnalysis.beats.length} beats</span>
            {autoCutSuggestions.length > 0 && (
              <span>{autoCutSuggestions.length} cut suggestions</span>
            )}
          </div>

          <label className="studio-beat-cut-field">
            <span>Sensitivity</span>
            <div className="studio-beat-cut-slider-row">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={beatSensitivity}
                onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                onMouseUp={() => void analyzeFromVideo()}
                onTouchEnd={() => void analyzeFromVideo()}
              />
              <span className="studio-beat-cut-slider-value">
                {Math.round(beatSensitivity * 100)}%
              </span>
            </div>
          </label>

          <label className="studio-beat-cut-field">
            <span>Cut density</span>
            <select
              className="studio-beat-cut-select"
              value={autoCutDensity}
              onChange={(e) => handleDensityChange(e.target.value as AutoCutDensity)}
            >
              {DENSITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="studio-beat-cut-toggle">
            <input
              type="checkbox"
              checked={showBeatMarkers}
              onChange={(e) => setShowBeatMarkers(e.target.checked)}
            />
            <span>Show beat markers on timeline</span>
          </label>

          {autoCutSuggestions.length > 0 && (
            <div className="studio-beat-cut-suggestions">
              <div className="studio-beat-cut-suggestions-head">
                <span>Suggested cuts</span>
                <span className="studio-beat-cut-suggestions-count">
                  {autoCutSuggestions.length}
                </span>
              </div>
              <ul className="studio-beat-cut-suggestion-list">
                {autoCutSuggestions.slice(0, 12).map((s) => (
                  <li key={s.timeSec}>
                    <button
                      type="button"
                      className="studio-beat-cut-suggestion-btn"
                      onClick={() => seekTimeline(s.timeSec)}
                    >
                      {formatTime(s.timeSec)}
                    </button>
                  </li>
                ))}
                {autoCutSuggestions.length > 12 && (
                  <li className="studio-beat-cut-suggestion-more">
                    +{autoCutSuggestions.length - 12} more
                  </li>
                )}
              </ul>
              <button
                type="button"
                className={cn('studio-tools-action-btn w-full', 'studio-tools-action-btn--secondary')}
                disabled={autoCutSuggestions.length === 0}
                onClick={() => applyAutoCutSuggestions()}
              >
                <Scissors size={14} />
                Apply {autoCutSuggestions.length} cuts
              </button>
            </div>
          )}

          <button
            type="button"
            className={cn(
              'studio-tools-action-btn w-full studio-beat-cut-clear',
              'studio-tools-action-btn--danger',
            )}
            onClick={() => clearBeatAnalysis()}
          >
            <Trash2 size={14} />
            Clear analysis
          </button>
        </>
      )}
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}
