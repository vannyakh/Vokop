import { useEffect, useState, type RefObject } from 'react';
import { Play, Pause, Sparkles, Loader2, Mic2, SkipBack } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useSegments } from '@/features/translation/hooks/useSegments';
import { formatDuration } from '@/lib/utils/time';
import { Button } from '@/components/ui/Button';

interface TimelineBarProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onProcessAll: () => void;
  onToggleSyncPlayback: () => void;
}

export function TimelineBar({ videoRef, onProcessAll, onToggleSyncPlayback }: TimelineBarProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const currentTime = useAppStore((s) => s.currentTime);
  const duration = useAppStore((s) => s.duration);
  const status = useAppStore((s) => s.status);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const isSyncPlaying = useAppStore((s) => s.isSyncPlaying);
  const { transcriptSegments, translationSegments } = useSegments();
  const [isPaused, setIsPaused] = useState(true);

  const segments = translationSegments.length > 0 ? translationSegments : transcriptSegments;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    setIsPaused(video.paused);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [videoRef, videoUrl]);

  const togglePlay = () => {
    if (videoRef.current?.paused) videoRef.current.play();
    else videoRef.current?.pause();
  };

  const seekToStart = () => {
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  return (
    <div className="shrink-0 studio-glass border-t border-white/5 px-5 py-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={seekToStart}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
            title="Restart"
          >
            <SkipBack size={16} />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-11 h-11 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-white/10"
          >
            {isPaused ? <Play size={20} fill="currentColor" className="ml-0.5" /> : <Pause size={20} />}
          </button>

          <div className="font-mono text-sm tabular-nums">
            <span className="text-white font-semibold">{formatDuration(currentTime)}</span>
            <span className="text-faint mx-1.5">/</span>
            <span className="text-faint">{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="md" onClick={onProcessAll} disabled={status !== 'idle'}>
            {status === 'idle' ? (
              <Sparkles size={14} />
            ) : (
              <Loader2 size={14} className="animate-spin" />
            )}
            Process All
          </Button>

          <button
            type="button"
            onClick={onToggleSyncPlayback}
            disabled={!audioBase64}
            className={cn(
              'px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-30',
              isSyncPlaying
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white border border-white/5',
            )}
          >
            {isSyncPlaying ? <Pause size={14} /> : <Mic2 size={14} />}
            Live Preview
          </button>
        </div>
      </div>

      <div
        className="relative h-2 bg-black/40 rounded-full cursor-pointer group overflow-hidden"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          if (videoRef.current && duration) {
            videoRef.current.currentTime = pct * duration;
          }
        }}
      >
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:color-mix(in_srgb,var(--accent)_40%,transparent)] to-[color:color-mix(in_srgb,var(--accent-2)_60%,transparent)] rounded-full transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5"
          style={{ left: `${progress}%` }}
        />
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white/15"
            style={{ left: duration ? `${(seg.time / duration) * 100}%` : '0%' }}
          />
        ))}
      </div>
    </div>
  );
}
