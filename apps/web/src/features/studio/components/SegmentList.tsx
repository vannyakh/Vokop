import type { RefObject } from 'react';
import { Languages, Type } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Segment } from '@/types';
import { formatDuration } from '@/lib/utils/time';
import { useAppStore } from '@/features/project';

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
    <div className="studio-empty">
      <div className="studio-empty-icon">
        {isTranslation ? <Languages size={22} /> : <Type size={22} />}
      </div>
      <p className="studio-empty-title">
        {isTranslation ? 'No translation yet' : 'No transcript yet'}
      </p>
      <p className="studio-empty-desc">
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
  onUpdateSegment,
}: SegmentListProps) {
  const seekTimeline = useAppStore((s) => s.seekTimeline);

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
          className={cn('studio-segment-card', activeSegmentIndex === i && 'active')}
          onClick={() => seekTimeline(seg.time)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') seekTimeline(seg.time);
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold text-accent tabular-nums">
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
              type === 'translation' ? 'text-[var(--text)] font-medium' : 'text-muted',
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
