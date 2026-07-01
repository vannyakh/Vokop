import type { RefObject } from 'react';
import { Languages, Type } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Segment } from '@/types';
import { formatDuration } from '@/lib/utils/time';

interface SegmentListProps {
  segments: Segment[];
  activeSegmentIndex: number;
  type: 'transcript' | 'translation';
  videoRef: RefObject<HTMLVideoElement | null>;
  onUpdateSegment: (index: number, text: string, type: 'transcript' | 'translation') => void;
}

function EmptyState({ type }: { type: 'transcript' | 'translation' }) {
  const isTranslation = type === 'translation';
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl studio-panel flex items-center justify-center mb-4">
        {isTranslation ? (
          <Languages size={24} className="text-accent/60" />
        ) : (
          <Type size={24} className="text-accent/60" />
        )}
      </div>
      <p className="text-sm font-medium text-muted mb-1">
        {isTranslation ? 'No translation yet' : 'No transcript yet'}
      </p>
      <p className="text-xs text-faint leading-relaxed max-w-[220px]">
        {isTranslation
          ? 'Run Process All to generate translated segments with timestamps.'
          : 'Transcripts appear here after you process the video.'}
      </p>
    </div>
  );
}

export function SegmentList({
  segments,
  activeSegmentIndex,
  type,
  videoRef,
  onUpdateSegment,
}: SegmentListProps) {
  if (segments.length === 0) {
    return <EmptyState type={type} />;
  }

  return (
    <div className="space-y-2">
      {segments.map((seg, i) => (
        <div
          key={i}
          role="button"
          tabIndex={0}
          className={cn(
            'p-3 rounded-xl transition-all border cursor-pointer',
            activeSegmentIndex === i
              ? 'bg-accent-soft border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] shadow-lg shadow-[rgba(232,163,61,0.25)]/5'
              : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10',
          )}
          onClick={() => {
            if (videoRef.current) videoRef.current.currentTime = seg.time;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && videoRef.current) {
              videoRef.current.currentTime = seg.time;
            }
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold text-accent/80 tabular-nums">
              {formatDuration(seg.time)}
            </span>
            {seg.speaker && (
              <>
                <span className="text-faint">·</span>
                <span className="text-[10px] font-semibold text-faint uppercase tracking-wide truncate">
                  {seg.speaker}
                </span>
              </>
            )}
          </div>
          <textarea
            value={seg.text}
            onChange={(e) => onUpdateSegment(i, e.target.value, type)}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full bg-transparent border-none p-0 text-sm leading-relaxed focus:ring-0 resize-none outline-none',
              type === 'translation' ? 'text-white font-medium' : 'text-muted',
            )}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
        </div>
      ))}
    </div>
  );
}
