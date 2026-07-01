import type { RefObject } from 'react';
import { Sparkles, Play, Pause, Volume2, Film } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { parseTimeToSeconds } from '@/lib/utils/time';

interface AnalysisPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onPlayAnalysis: () => void;
  onStartReel: () => void;
}

export function AnalysisPanel({ videoRef, onPlayAnalysis, onStartReel }: AnalysisPanelProps) {
  const videoAnalysis = useAppStore((s) => s.videoAnalysis);
  const analysisAudio = useAppStore((s) => s.analysisAudio);
  const isPlayingAnalysis = useAppStore((s) => s.isPlayingAnalysis);
  const isReelMode = useAppStore((s) => s.isReelMode);
  const currentReelStep = useAppStore((s) => s.currentReelStep);

  if (!videoAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl studio-panel flex items-center justify-center mb-4">
          <Sparkles size={24} className="text-accent/60" />
        </div>
        <p className="text-sm font-medium text-muted mb-1">No analysis yet</p>
        <p className="text-xs text-faint leading-relaxed max-w-[220px]">
          Process your video to get AI summaries and highlight reels.
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
              AI Summary
            </span>
          </div>
          {analysisAudio && (
            <button
              type="button"
              onClick={onPlayAnalysis}
              className={cn(
                'p-2 rounded-lg transition-all',
                isPlayingAnalysis
                  ? 'bg-red-500/90 text-white'
                  : 'bg-white/5 text-accent hover:bg-white/10',
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
              Highlights
            </span>
          </div>
          <button
            type="button"
            onClick={onStartReel}
            disabled={isReelMode}
            className="text-[10px] font-bold text-accent hover:text-accent transition-colors uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40"
          >
            <Play size={10} fill="currentColor" />
            Play All
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
                  if (videoRef.current) {
                    videoRef.current.currentTime = parseTimeToSeconds(highlight.start);
                    videoRef.current.play();
                  }
                }}
                className={cn(
                  'flex flex-col gap-2 p-3 rounded-xl border transition-all text-left',
                  isActive
                    ? 'bg-accent border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] shadow-lg shadow-[rgba(232,163,61,0.25)]/20'
                    : 'studio-panel hover:border-white/15',
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
                      isActive ? 'bg-white animate-pulse' : 'bg-white/15',
                    )}
                  />
                </div>
                <p
                  className={cn(
                    'text-xs font-medium leading-snug',
                    isActive ? 'text-white' : 'text-muted',
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
