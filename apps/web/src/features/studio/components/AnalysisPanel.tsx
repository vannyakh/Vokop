import type { RefObject } from 'react';
import { Sparkles, Play, Pause, Volume2, Film } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useTranslation } from '@/features/settings';
import { parseTimeToSeconds } from '@/lib/utils/time';

interface AnalysisPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onPlayAnalysis: () => void;
  onStartReel: () => void;
}

export function AnalysisPanel({ onPlayAnalysis, onStartReel }: AnalysisPanelProps) {
  const { t } = useTranslation();
  const videoAnalysis = useAppStore((s) => s.videoAnalysis);
  const analysisAudio = useAppStore((s) => s.analysisAudio);
  const isPlayingAnalysis = useAppStore((s) => s.isPlayingAnalysis);
  const isReelMode = useAppStore((s) => s.isReelMode);
  const currentReelStep = useAppStore((s) => s.currentReelStep);

  if (!videoAnalysis) {
    return (
      <div className="studio-empty">
        <div className="studio-empty-icon">
          <Sparkles size={22} />
        </div>
        <p className="studio-empty-title">{t('emptyAnalysisTitle')}</p>
        <p className="studio-empty-desc">
          {t('emptyAnalysisDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="studio-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest">
              {t('aiSummary')}
            </span>
          </div>
          {analysisAudio && (
            <button
              type="button"
              onClick={onPlayAnalysis}
              className={cn(
                'p-2 rounded-lg border transition-colors cursor-pointer',
                isPlayingAnalysis
                  ? 'bg-[rgba(232,116,106,0.15)] border-[rgba(232,116,106,0.3)] text-[#e8746a]'
                  : 'bg-[var(--surface-hi)] border-[color:var(--border)] text-accent hover:border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)]',
              )}
            >
              {isPlayingAnalysis ? <Pause size={12} /> : <Volume2 size={12} />}
            </button>
          )}
        </div>
        <p className="text-sm text-muted leading-relaxed">{videoAnalysis.summary}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Film size={12} className="text-faint" />
            <span className="text-[10px] font-bold text-faint uppercase tracking-widest">
              {t('highlights')}
            </span>
          </div>
          <button
            type="button"
            onClick={onStartReel}
            disabled={isReelMode}
            className="text-[10px] font-bold text-accent hover:text-accent transition-colors uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40"
          >
            <Play size={10} fill="currentColor" />
            {t('playAll')}
          </button>
        </div>

        <div className="grid gap-2">
          {videoAnalysis.highlights.map((highlight, i) => {
            const isActive = isReelMode && currentReelStep === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const time = parseTimeToSeconds(highlight.start);
                  useAppStore.getState().seekTimeline(time);
                  useAppStore.getState().setTimelinePlaying(true);
                }}
                className={cn(
                  'flex flex-col gap-2 p-3 rounded-xl border transition-colors text-left cursor-pointer',
                  isActive
                    ? 'bg-accent-soft border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)]'
                    : 'studio-panel hover:border-[color:var(--border-strong)]',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold tabular-nums',
                      isActive ? 'text-[var(--text)]' : 'text-accent',
                    )}
                  >
                    {highlight.start} → {highlight.end}
                  </span>
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isActive ? 'bg-accent animate-pulse' : 'bg-[color:var(--border-strong)]',
                    )}
                  />
                </div>
                <p
                  className={cn(
                    'text-xs font-medium leading-snug',
                    isActive ? 'text-[var(--text)]' : 'text-muted',
                  )}
                >
                  {highlight.narration}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
