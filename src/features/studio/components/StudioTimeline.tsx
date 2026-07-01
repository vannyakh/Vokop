import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import {
  formatStudioTimecode,
  pxToTime,
  timeToPx,
} from '@/features/studio/lib/timelineUtils';
import {
  TIMELINE_BASE_PX_PER_SEC,
  TIMELINE_RULER_HEIGHT,
  TRACK_HEIGHT,
} from '@/features/studio/lib/timelineTypes';
import { useVideoFilmstrip } from '@/features/studio/hooks/useVideoFilmstrip';
import { useTimelineTracks } from '@/features/studio/hooks/useTimelineTracks';
import { useTimelineClipDrag } from '@/features/studio/hooks/useTimelineClipDrag';
import { TimelineTrackHeader } from '@/features/studio/components/TimelineTrackHeader';
import { TimelineClipBlock } from '@/features/studio/components/TimelineClipBlock';
import { TimelineVoiceWaveform } from '@/features/studio/components/TimelineVoiceWaveform';
import {
  TimelineContextMenu,
  type TimelineContextMenuTarget,
} from '@/features/studio/components/TimelineContextMenu';
import type { TimelineTrackId } from '@/features/studio/lib/timelineTypes';

interface StudioTimelineProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying?: boolean;
}

function formatRulerTick(seconds: number): string {
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return formatStudioTimecode(seconds);
}

export function StudioTimeline({ videoRef, isPlaying = false }: StudioTimelineProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const videoFile = useAppStore((s) => s.videoFile);
  const duration = useAppStore((s) => s.duration);
  const currentTime = useAppStore((s) => s.currentTime);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const timelineZoom = useAppStore((s) => s.timelineZoom);
  const timelineTrackMuted = useAppStore((s) => s.timelineTrackMuted);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const toggleTimelineTrackMuted = useAppStore((s) => s.toggleTimelineTrackMuted);
  const setSelectedTimelineClip = useAppStore((s) => s.setSelectedTimelineClip);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const removeTimelineClip = useAppStore((s) => s.removeTimelineClip);
  const addTimelineClip = useAppStore((s) => s.addTimelineClip);
  const splitTimelineAtPlayhead = useAppStore((s) => s.splitTimelineAtPlayhead);
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);

  const tracks = useTimelineTracks();
  const { thumbnails, loading: filmstripLoading, thumbWidth } = useVideoFilmstrip(
    videoFile,
    duration,
  );

  const [draggingPlayhead, setDraggingPlayhead] = useState(false);
  const [contextMenu, setContextMenu] = useState<TimelineContextMenuTarget | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerColRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const pxPerSec = TIMELINE_BASE_PX_PER_SEC * (timelineZoom / 100);
  const timelineContentWidth = Math.max(640, timeToPx(duration || 1, pxPerSec) + 80);
  const playheadX = timeToPx(currentTime, pxPerSec);

  const { beginClipDrag } = useTimelineClipDrag(pxPerSec, duration);

  const rulerTicks = useMemo(() => {
    if (!duration) return [0];
    const ticks: number[] = [];
    for (let t = 0; t <= Math.ceil(duration); t++) ticks.push(t);
    return ticks;
  }, [duration]);

  const seekTo = useCallback(
    (time: number) => {
      if (!videoRef.current || !duration) return;
      videoRef.current.currentTime = Math.min(Math.max(0, time), duration);
    },
    [videoRef, duration],
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const ruler = rulerRef.current;
      const scroll = scrollRef.current;
      if (!ruler || !scroll) return;
      const rect = ruler.getBoundingClientRect();
      const x = clientX - rect.left + scroll.scrollLeft;
      seekTo(pxToTime(x, pxPerSec));
    },
    [seekTo, pxPerSec],
  );

  const seekFromLaneClick = useCallback(
    (clientX: number) => {
      const scroll = scrollRef.current;
      if (!scroll) return;
      const rect = scroll.getBoundingClientRect();
      const x = clientX - rect.left + scroll.scrollLeft;
      seekTo(pxToTime(x, pxPerSec));
    },
    [seekTo, pxPerSec],
  );

  useEffect(() => {
    if (!draggingPlayhead) return;
    const onMove = (e: PointerEvent) => seekFromLaneClick(e.clientX);
    const onUp = () => setDraggingPlayhead(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingPlayhead, seekFromLaneClick]);

  useEffect(() => {
    if (!scrollRef.current || draggingPlayhead || !isPlaying) return;
    const el = scrollRef.current;
    const { scrollLeft, clientWidth } = el;
    if (playheadX < scrollLeft + 24 || playheadX > scrollLeft + clientWidth - 40) {
      el.scrollLeft = Math.max(0, playheadX - clientWidth / 2);
    }
  }, [playheadX, draggingPlayhead, isPlaying]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTimelineClip) {
        const { trackId, clipId } = selectedTimelineClip;
        if (trackId === 'text' || trackId === 'overlay') {
          removeTimelineClip(trackId, clipId);
          selectCanvasElement(null);
        }
      }
      if (e.key === 'Escape') {
        setSelectedTimelineClip(null);
        selectCanvasElement(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedTimelineClip, removeTimelineClip, setSelectedTimelineClip, selectCanvasElement]);

  const syncHeaderScroll = () => {
    if (headerColRef.current && scrollRef.current) {
      headerColRef.current.scrollTop = scrollRef.current.scrollTop;
    }
  };

  const timeAtClientX = useCallback(
    (clientX: number) => {
      const scroll = scrollRef.current;
      if (!scroll) return currentTime;
      const rect = scroll.getBoundingClientRect();
      const x = clientX - rect.left + scroll.scrollLeft;
      return pxToTime(x, pxPerSec);
    },
    [pxPerSec, currentTime],
  );

  const openContextMenu = useCallback(
    (e: ReactMouseEvent, opts?: { trackId?: TimelineTrackId; clipId?: string }) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        trackId: opts?.trackId,
        clipId: opts?.clipId,
        time: timeAtClientX(e.clientX),
      });
    },
    [timeAtClientX],
  );

  const selectClip = useCallback(
    (trackId: TimelineTrackId, clipId: string) => {
      setSelectedTimelineClip({ trackId, clipId });
      if (trackId === 'text' || trackId === 'overlay') {
        selectCanvasElement(clipId);
      } else {
        selectCanvasElement(null);
      }
    },
    [setSelectedTimelineClip, selectCanvasElement],
  );

  const canDeleteSelection =
    selectedTimelineClip?.trackId === 'text' || selectedTimelineClip?.trackId === 'overlay';

  const canSplitSelection =
    selectedTimelineClip?.trackId === 'text' ||
    (selectedTimelineClip?.trackId === 'overlay' &&
      !selectedTimelineClip.clipId.startsWith('logo-') &&
      !selectedTimelineClip.clipId.startsWith('image-'));

  if (!videoUrl) return null;

  return (
    <div
      className="studio-timeline-pinned-layout"
      onClick={() => {
        setSelectedTimelineClip(null);
        selectCanvasElement(null);
        setContextMenu(null);
      }}
    >
      <div className="studio-timeline-header-col" ref={headerColRef}>
        <div
          className="studio-timeline-header-spacer"
          style={{ height: TIMELINE_RULER_HEIGHT }}
        />
        {tracks.map((track) => (
          <TimelineTrackHeader
            key={track.id}
            track={track}
            height={TRACK_HEIGHT[track.type]}
            muted={timelineTrackMuted[track.id]}
            onToggleMute={() => toggleTimelineTrackMuted(track.id)}
            onAddClip={() => addTimelineClip(track.id as TimelineTrackId, currentTime)}
          />
        ))}
      </div>

      <div
        className="studio-timeline-scroll"
        ref={scrollRef}
        onScroll={syncHeaderScroll}
        onContextMenu={(e) => openContextMenu(e)}
        style={{ ['--timeline-grid' as string]: `${pxPerSec}px` }}
      >
        <div
          className="studio-timeline-content"
          style={{ width: timelineContentWidth }}
        >
          <div
            ref={rulerRef}
            className="studio-timeline-ruler"
            style={{ height: TIMELINE_RULER_HEIGHT }}
            onClick={(e) => {
              e.stopPropagation();
              seekFromClientX(e.clientX);
            }}
            onContextMenu={(e) => openContextMenu(e)}
          >
            {rulerTicks.map((tick) => (
              <div
                key={tick}
                className="studio-timeline-ruler-tick"
                style={{ left: timeToPx(tick, pxPerSec) }}
              >
                <span className="studio-timeline-ruler-tick-line" />
                <span className="studio-timeline-ruler-tick-label font-mono">
                  {formatRulerTick(tick)}
                </span>
              </div>
            ))}
          </div>

          {tracks.map((track) => {
            const laneHeight = TRACK_HEIGHT[track.type];
            const muted = timelineTrackMuted[track.id];

            return (
              <div
                key={track.id}
                className={cn('studio-timeline-lane', `studio-timeline-lane--${track.type}`)}
                style={{ height: laneHeight, opacity: muted ? 0.4 : 1 }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.studio-timeline-clip-block')) return;
                  seekFromLaneClick(e.clientX);
                }}
                onContextMenu={(e) => {
                  if ((e.target as HTMLElement).closest('.studio-timeline-clip-block')) return;
                  openContextMenu(e, { trackId: track.id as TimelineTrackId });
                }}
              >
                {track.clips.map((clip) => {
                  const left = timeToPx(clip.start, pxPerSec);
                  const width = Math.max(28, timeToPx(clip.duration, pxPerSec));
                  const selected =
                    selectedTimelineClip?.clipId === clip.id &&
                    selectedTimelineClip.trackId === track.id;

                  return (
                    <TimelineClipBlock
                      key={clip.id}
                      clip={clip}
                      track={track}
                      left={left}
                      width={width}
                      height={laneHeight - 8}
                      selected={selected}
                      filmstripThumbs={track.type === 'video' ? thumbnails : undefined}
                      thumbWidth={thumbWidth}
                      onSelect={() => selectClip(track.id as TimelineTrackId, clip.id)}
                      onDelete={() => {
                        removeTimelineClip(track.id, clip.id);
                        selectCanvasElement(null);
                      }}
                      onContextMenu={(e) =>
                        openContextMenu(e, {
                          trackId: track.id as TimelineTrackId,
                          clipId: clip.id,
                        })
                      }
                      onDragStart={(e, mode) => beginClipDrag(e, track.id, clip, mode)}
                    >
                      {track.type === 'audio' && audioBase64 && (
                        <TimelineVoiceWaveform
                          audioBase64={audioBase64}
                          width={width}
                          videoRef={videoRef}
                          onSeek={seekTo}
                        />
                      )}
                    </TimelineClipBlock>
                  );
                })}

                {track.type === 'video' && filmstripLoading && thumbnails.length === 0 && (
                  <div className="studio-timeline-filmstrip-loading">Generating footage…</div>
                )}
              </div>
            );
          })}

          <div
            className={cn('studio-timeline-playhead', draggingPlayhead && 'is-dragging')}
            style={{ left: playheadX }}
            onPointerDown={(e: ReactPointerEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingPlayhead(true);
              seekFromLaneClick(e.clientX);
            }}
          >
            <div className="studio-timeline-playhead-knob" />
            <div className="studio-timeline-playhead-line" />
          </div>
        </div>
      </div>

      <TimelineContextMenu
        target={contextMenu}
        onClose={() => setContextMenu(null)}
        onSeek={seekTo}
        onSplit={splitTimelineAtPlayhead}
        onDelete={() => {
          if (!selectedTimelineClip) return;
          removeTimelineClip(selectedTimelineClip.trackId, selectedTimelineClip.clipId);
          selectCanvasElement(null);
        }}
        onAddClip={(trackId) => addTimelineClip(trackId, contextMenu?.time ?? currentTime)}
        onSelectFootage={() => {
          const clipId =
            contextMenu?.clipId ?? tracks.find((t) => t.id === 'video')?.clips[0]?.id;
          if (clipId) selectClip('video', clipId);
        }}
        onOpenMedia={() => {
          setActiveStudioTool('media');
          setToolsDrawerOpen(true);
        }}
        onEditCanvas={() => {
          if (selectedTimelineClip) selectCanvasElement(selectedTimelineClip.clipId);
        }}
        canSplit={canSplitSelection}
        canDelete={canDeleteSelection}
        canEditCanvas={
          selectedTimelineClip?.trackId === 'text' || selectedTimelineClip?.trackId === 'overlay'
        }
      />
    </div>
  );
}
