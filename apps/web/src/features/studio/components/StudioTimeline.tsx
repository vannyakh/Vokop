import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type DragEvent as ReactDragEvent,
  type RefObject,
} from 'react';
import type {
  TimelineClipModel,
  TimelineTrackId,
  TimelineTrackType,
} from '@/features/studio/lib/timelineTypes';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import {
  formatStudioTimecode,
  pxToTime,
  timeToPx,
} from '@/features/studio/lib/timelineUtils';
import {
  ADDABLE_TRACK_TYPES,
  TIMELINE_BASE_PX_PER_SEC,
  TIMELINE_RULER_HEIGHT,
  TRACK_HEIGHT,
} from '@/features/studio/lib/timelineTypes';
import { useTranslation } from '@/features/settings';
import { useSidePanelSplit } from '@/features/studio/hooks/useSidePanelSplit';
import { useVideoFilmstrip } from '@/features/studio/hooks/useVideoFilmstrip';
import { useTimelineTracks } from '@/features/studio/hooks/useTimelineTracks';
import { useTimelineClipDrag } from '@/features/studio/hooks/useTimelineClipDrag';
import { useTimelineSelection } from '@/features/studio/hooks/useTimelineSelection';
import type { TimelineSelectionItem } from '@/features/studio/lib/timelineTypes';
import { TimelineTrackHeader } from '@/features/studio/components/TimelineTrackHeader';
import { TimelineClipBlock } from '@/features/studio/components/TimelineClipBlock';
import { TimelineClipWaveform } from '@/features/studio/components/TimelineClipWaveform';
import {
  TimelineContextMenu,
  type TimelineContextMenuTarget,
} from '@/features/studio/components/TimelineContextMenu';
import {
  ImageIcon,
  Film,
  Mic2,
  Music2,
  Plus,
  Sparkles,
  Sticker,
  Type,
} from 'lucide-react';
import { Dropdown } from '@vokop/ui/antd';
import {
  clipCanMoveToTrack,
  isAudioLikeTimelineTrack,
  isEditableTimelineTrack,
  isVisualTimelineTrack,
} from '@/features/studio/lib/timelineTrackUtils';
import {
  dropHintForTrack,
  isTimelineExternalDrag,
  resolveEmptyTimelineDrop,
  trackAcceptsDrop,
} from '@/features/studio/lib/timelineDrop';
import { useTranscriptReady } from '@/features/studio/hooks/useTranscriptReady';
import { processTimelineMediaDrop } from '@/features/studio/lib/timelineMediaDrop';
import { filmstripThumbsForClip } from '@/features/studio/lib/timelineFilmstrip';
import { studioEdit } from '@/features/studio/services/studioEdit';
import { TimelineEmptyState } from '@/features/studio/components/TimelineEmptyState';
import {
  emptyTimelineDurationSec,
  isTimelineEmpty,
} from '@/features/studio/lib/timelineEmpty';

interface StudioTimelineProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying?: boolean;
}

const ADD_TRACK_ICONS = {
  video: Film,
  image: ImageIcon,
  sticker: Sticker,
  text: Type,
  effect: Sparkles,
  sound: Music2,
  audio: Mic2,
} as const;

function formatRulerTick(seconds: number, compact = false): string {
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (compact) {
      // Skip leading zero minute: "0:05" → "0:05", "1:00" → "1:00"
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const h = Math.floor(seconds / 3600);
  const rem = seconds % 3600;
  const m = Math.floor(rem / 60);
  const s = Math.floor(rem % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Choose adaptive major/minor tick intervals based on zoom level.
 * Returns { majorInterval, minorDivisions } where minorDivisions is how many
 * minor ticks fit between each pair of major ticks.
 */
function getRulerIntervals(pxPerSec: number): { majorInterval: number; minorDivisions: number } {
  // Target: major tick every ~80-160px
  const candidates: [number, number][] = [
    [1,    5],   // 1s major, 5 minor (0.2s each)
    [5,    5],   // 5s major, 5 minor (1s each)
    [10,   5],   // 10s major
    [15,   3],   // 15s major
    [30,   5],   // 30s
    [60,   4],   // 1 min
    [120,  4],   // 2 min
    [300,  5],   // 5 min
    [600,  5],   // 10 min
  ];
  for (const [interval, divisions] of candidates) {
    if (pxPerSec * interval >= 90) return { majorInterval: interval, minorDivisions: divisions };
  }
  return { majorInterval: 600, minorDivisions: 5 };
}

export function StudioTimeline({ videoRef, isPlaying = false }: StudioTimelineProps) {
  const { t } = useTranslation();
  const {
    width: headerWidth,
    minWidth,
    maxWidth,
    dragging: splitDragging,
    splitterProps,
  } = useSidePanelSplit({
    storageKey: 'vokop-timeline-header-width',
    defaultWidth: 220,
    minWidth: 150,
    maxWidth: 400,
    edge: 'left',
  });
  const videoUrl = useAppStore((s) => s.videoUrl);
  const projectId = useAppStore((s) => s.projectId);
  const videoFile = useAppStore((s) => s.videoFile);
  const duration = useAppStore((s) => s.duration);
  const mediaDuration = useAppStore((s) => s.mediaDuration);
  const currentTime = useAppStore((s) => s.currentTime);
  const timelineZoom = useAppStore((s) => s.timelineZoom);
  const videoClips = useAppStore((s) => s.videoClips);
  const timelineTrackMuted = useAppStore((s) => s.timelineTrackMuted);
  const timelineTrackPreviewHidden = useAppStore((s) => s.timelineTrackPreviewHidden);
  const toggleTimelineTrackMuted = useAppStore((s) => s.toggleTimelineTrackMuted);
  const toggleTimelineTrackPreviewHidden = useAppStore((s) => s.toggleTimelineTrackPreviewHidden);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const addTimelineClip = useAppStore((s) => s.addTimelineClip);
  const addTimelineTrack = useAppStore((s) => s.addTimelineTrack);
  const removeTimelineTrack = useAppStore((s) => s.removeTimelineTrack);
  const reorderTimelineTracks = useAppStore((s) => s.reorderTimelineTracks);
  const renameTimelineTrack = useAppStore((s) => s.renameTimelineTrack);
  const moveTimelineClipToTrack = useAppStore((s) => s.moveTimelineClipToTrack);
  const addClipKeyframe = useAppStore((s) => s.addClipKeyframe);
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);
  const {
    primary: selectedTimelineClip,
    isSelected,
    selectClip,
    selectItems,
    clearSelection,
    deleteSelection,
    copySelection,
    cutSelection,
    pasteSelection,
    duplicateSelection,
    hasClipboard,
    canDelete: canDeleteSelection,
    canEditCanvas,
    canAddKeyframe,
    canSplit,
    splitAtPlayhead,
  } = useTimelineSelection();
  const addMediaAssetToTimeline = useAppStore((s) => s.addMediaAssetToTimeline);
  const ensureTimelineTrackVisible = useAppStore((s) => s.ensureTimelineTrackVisible);
  const addTextTemplate = useAppStore((s) => s.addTextTemplate);
  const importMediaFiles = useAppStore((s) => s.importMediaFiles);
  const transcriptReady = useTranscriptReady();
  const beatAnalysis = useAppStore((s) => s.beatAnalysis);
  const showBeatMarkers = useAppStore((s) => s.showBeatMarkers);
  const autoCutSuggestions = useAppStore((s) => s.autoCutSuggestions);

  const videoSessionId = useAppStore((s) => s.videoSessionId);
  const [dragTrackId, setDragTrackId] = useState<string | null>(null);
  const [dropHeaderTrackId, setDropHeaderTrackId] = useState<string | null>(null);
  const [externalDrop, setExternalDrop] = useState<{
    trackId: string;
    allowed: boolean;
    time: number;
    x: number;
    hint: string;
  } | null>(null);
  const tracks = useTimelineTracks();
  const timelineIsEmpty = isTimelineEmpty(tracks);
  const displayDuration = timelineIsEmpty ? emptyTimelineDurationSec(duration) : duration || 1;
  const { thumbnails, loading: filmstripLoading, progress: filmstripProgress } =
    useVideoFilmstrip(videoFile, mediaDuration || duration, videoSessionId);

  const [draggingPlayhead, setDraggingPlayhead] = useState(false);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<TimelineContextMenuTarget | null>(null);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerColRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<{ rect: DOMRect; x1: number; y1: number; x2: number; y2: number } | null>(null);

  const pxPerSec = TIMELINE_BASE_PX_PER_SEC * (timelineZoom / 100);
  const timelineContentWidth = Math.max(640, timeToPx(displayDuration, pxPerSec) + 80);
  const playheadX = timeToPx(currentTime, pxPerSec);

  const { beginClipDrag, dragPreview, snapIndicator, hoverTrackId } = useTimelineClipDrag(
    pxPerSec,
    duration,
    tracks,
    tracksContainerRef,
  );

  const { rulerMajorTicks, rulerMinorTicks } = useMemo(() => {
    const span = displayDuration;
    if (!span) return { rulerMajorTicks: [0], rulerMinorTicks: [] as number[] };
    const { majorInterval, minorDivisions } = getRulerIntervals(pxPerSec);
    const minorInterval = majorInterval / minorDivisions;
    const majorTicks: number[] = [];
    const minorTicks: number[] = [];
    // Major ticks
    for (let t = 0; t <= span + majorInterval; t += majorInterval) {
      const snapped = Math.round(t / majorInterval) * majorInterval;
      if (snapped <= span + majorInterval) majorTicks.push(snapped);
    }
    // Minor ticks (exclude positions that coincide with major)
    const majorSet = new Set(majorTicks.map((t) => Math.round(t * 1000)));
    for (let t = 0; t <= span + majorInterval; t += minorInterval) {
      const snapped = Math.round(t * 1000);
      if (!majorSet.has(snapped)) {
        const secs = snapped / 1000;
        if (secs <= span + minorInterval) minorTicks.push(secs);
      }
    }
    return { rulerMajorTicks: majorTicks, rulerMinorTicks: minorTicks };
  }, [displayDuration, pxPerSec]);

  const seekTimeline = useAppStore((s) => s.seekTimeline);

  const seekTo = useCallback(
    (time: number) => {
      if (!displayDuration) return;
      seekTimeline(Math.min(time, displayDuration));
    },
    [displayDuration, seekTimeline],
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

  const trackTops = useMemo(() => {
    let acc = 0;
    return tracks.map((t) => {
      const top = acc;
      acc += TRACK_HEIGHT[t.type];
      return top;
    });
  }, [tracks]);

  /* marquee select handlers */
  const beginMarquee = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const container = tracksContainerRef.current;
      if (!container) return;
      clearSelection({ clearCanvas: true });
      const rect = container.getBoundingClientRect();
      const scroll = scrollRef.current?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scroll;
      const y = e.clientY - rect.top;
      marqueeRef.current = { rect, x1: x, y1: y, x2: x, y2: y };
      setMarquee({ x1: x, y1: y, x2: x, y2: y });

      const onMove = (ev: PointerEvent) => {
        const m = marqueeRef.current;
        if (!m) return;
        const s = scrollRef.current?.scrollLeft ?? 0;
        m.x2 = ev.clientX - m.rect.left + s;
        m.y2 = ev.clientY - m.rect.top;
        setMarquee({ x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 });
      };
      const onUp = () => {
        const m = marqueeRef.current;
        if (m) {
          const mx1 = Math.min(m.x1, m.x2);
          const mx2 = Math.max(m.x1, m.x2);
          const my1 = Math.min(m.y1, m.y2);
          const my2 = Math.max(m.y1, m.y2);
          if (mx2 - mx1 > 4 || my2 - my1 > 4) {
            const hits: TimelineSelectionItem[] = [];
            tracks.forEach((t, i) => {
              const top = trackTops[i] + 4;
              const bottom = top + TRACK_HEIGHT[t.type] - 8;
              if (bottom < my1 || top > my2) return;
              t.clips.forEach((c: TimelineClipModel) => {
                const cl = timeToPx(c.start, pxPerSec);
                const cr = cl + Math.max(28, timeToPx(c.duration, pxPerSec));
                if (cr < mx1 || cl > mx2) return;
                hits.push({ trackId: t.id as TimelineTrackId, clipId: c.id });
              });
            });
            if (hits.length) selectItems(hits, hits[0] ?? null);
          }
        }
        marqueeRef.current = null;
        setMarquee(null);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [tracks, trackTops, pxPerSec, clearSelection, selectItems],
  );

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
      if (e.key === 'Escape') clearSelection({ clearCanvas: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection]);

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

  const updateExternalDrop = useCallback(
    (e: ReactDragEvent, trackId: string, trackType: TimelineTrackType) => {
      const types = Array.from(e.dataTransfer.types);
      if (!isTimelineExternalDrag(types)) return false;
      e.preventDefault();
      e.stopPropagation();
      const allowed = trackAcceptsDrop(trackId, trackType, types);
      e.dataTransfer.dropEffect = allowed ? 'copy' : 'none';
      const time = Math.max(0, timeAtClientX(e.clientX));
      const x = Math.max(0, timeToPx(time, pxPerSec));
      setExternalDrop({
        trackId,
        allowed,
        time,
        x,
        hint: dropHintForTrack(trackId, trackType, types),
      });
      return true;
    },
    [pxPerSec, timeAtClientX],
  );

  const clearExternalDrop = useCallback(() => {
    setExternalDrop(null);
  }, []);

  const onLaneDragOver = useCallback(
    (e: ReactDragEvent, trackId: string, trackType: TimelineTrackType) => {
      updateExternalDrop(e, trackId, trackType);
    },
    [updateExternalDrop],
  );

  const onLaneDrop = useCallback(
    async (e: ReactDragEvent, trackId: TimelineTrackId, trackType: TimelineTrackType) => {
      e.preventDefault();
      e.stopPropagation();
      const types = Array.from(e.dataTransfer.types);
      const atTime = Math.max(0, timeAtClientX(e.clientX));
      const allowed = trackAcceptsDrop(String(trackId), trackType, types);
      clearExternalDrop();
      if (!allowed) return;

      let targetTrackId = String(trackId);
      let targetTrackType = trackType;
      if (timelineIsEmpty) {
        const resolved = resolveEmptyTimelineDrop(
          types,
          e.dataTransfer.files?.length ? Array.from(e.dataTransfer.files) : undefined,
        );
        targetTrackId = resolved.trackId;
        targetTrackType = resolved.trackType;
      }

      await processTimelineMediaDrop({
        dataTransfer: e.dataTransfer,
        atTime,
        trackId: targetTrackId,
        trackType: targetTrackType,
        autoCreateTrack: true,
        actions: {
          ensureTimelineTrackVisible,
          addMediaAssetToTimeline,
          addTextTemplate,
          importMediaFiles,
        },
      });
    },
    [
      addMediaAssetToTimeline,
      addTextTemplate,
      clearExternalDrop,
      ensureTimelineTrackVisible,
      importMediaFiles,
      timeAtClientX,
      timelineIsEmpty,
    ],
  );

  const hoverTime = hoverX != null ? pxToTime(hoverX, pxPerSec) : null;

  if (!videoUrl && !projectId) return null;

  return (
    <div
      className={cn(
        'studio-timeline-pinned-layout',
        timelineIsEmpty && 'studio-timeline-pinned-layout--empty',
      )}
      onClick={(e) => {
        // Clips stop pointerdown but click still bubbles — don't clear on clip hits.
        const target = e.target as HTMLElement;
        if (
          target.closest('.studio-timeline-clip-block') ||
          target.closest('.studio-track-header') ||
          target.closest('.studio-track-menu') ||
          target.closest('.studio-timeline-context-menu') ||
          target.closest('.ant-dropdown') ||
          target.closest('.ant-modal-root')
        ) {
          return;
        }
        clearSelection({ clearCanvas: true });
        setContextMenu(null);
      }}
    >
      {/* Pinned track header column */}
      {!timelineIsEmpty && (
        <>
          <div
            className="studio-timeline-header-col"
            ref={headerColRef}
            style={{ width: headerWidth }}
          >
        <div
          className="studio-timeline-header-spacer"
          style={{ height: TIMELINE_RULER_HEIGHT }}
        />
        {tracks.map((track, index) => (
          <TimelineTrackHeader
            key={track.id}
            track={track}
            index={index}
            height={TRACK_HEIGHT[track.type]}
            muted={timelineTrackMuted[track.id] ?? false}
            previewHidden={timelineTrackPreviewHidden[track.id] ?? false}
            dragging={dragTrackId === track.id}
            dropTarget={dropHeaderTrackId === track.id && dragTrackId !== track.id}
            onToggleMute={() => toggleTimelineTrackMuted(track.id)}
            onTogglePreview={() => toggleTimelineTrackPreviewHidden(track.id)}
            onAddClip={() => addTimelineClip(track.id as TimelineTrackId, currentTime)}
            onDelete={() => removeTimelineTrack(String(track.id))}
            onRename={(label) => renameTimelineTrack(String(track.id), label)}
            hasSelectedClip={selectedTimelineClip?.trackId === track.id}
            onAddKeyframe={
              selectedTimelineClip?.trackId === track.id && selectedTimelineClip.clipId
                ? () => addClipKeyframe(selectedTimelineClip.clipId, currentTime)
                : undefined
            }
            moveTargets={(() => {
              if (selectedTimelineClip?.trackId !== track.id) return [];
              const clip = track.clips.find((c) => c.id === selectedTimelineClip.clipId);
              if (!clip) return [];
              return tracks
                .filter(
                  (t) =>
                    t.id !== track.id &&
                    clipCanMoveToTrack(clip, String(t.id), t.type),
                )
                .map((t) => ({ id: String(t.id), label: t.label }));
            })()}
            onMoveClipToTrack={
              selectedTimelineClip?.trackId === track.id && selectedTimelineClip.clipId
                ? (toId) =>
                    moveTimelineClipToTrack(
                      selectedTimelineClip.clipId,
                      String(track.id),
                      toId,
                    )
                : undefined
            }
            onExtractAudio={
              track.type === 'video'
                ? () => studioEdit.extractAudioFromVideoTrack(String(track.id))
                : undefined
            }
            onDetachAudio={
              track.type === 'video'
                ? () => studioEdit.detachAudioFromVideoTrack(String(track.id))
                : undefined
            }
            onDragStart={(id) => setDragTrackId(id)}
            onDragOver={(id) => setDropHeaderTrackId(id)}
            onDragEnd={() => {
              setDragTrackId(null);
              setDropHeaderTrackId(null);
            }}
            onDrop={(toId) => {
              if (dragTrackId) reorderTimelineTracks(dragTrackId, toId);
              setDragTrackId(null);
              setDropHeaderTrackId(null);
            }}
          />
        ))}
        <Dropdown
          trigger={['click']}
          placement="topLeft"
          menu={{
            className: 'studio-track-menu',
            items: ADDABLE_TRACK_TYPES.map((opt) => {
              const Icon = ADD_TRACK_ICONS[opt.type];
              return {
                key: opt.type,
                icon: <Icon size={14} />,
                label: t(`track${opt.type.charAt(0).toUpperCase()}${opt.type.slice(1)}` as any),
                onClick: () => addTimelineTrack(opt.type),
              };
            }),
          }}
        >
          <button type="button" className="studio-track-add-row" title={t('addTrack')}>
            <Plus size={12} />
            <span>{t('addTrack')}</span>
          </button>
        </Dropdown>
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize track header"
        aria-valuenow={Math.round(headerWidth)}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        className={cn('studio-side-splitter', splitDragging && 'is-dragging')}
        {...splitterProps}
      >
        <span className="studio-side-splitter-grip" aria-hidden>
          <span className="studio-side-splitter-pill studio-side-splitter-pill--accent" />
          <span className="studio-side-splitter-thumb" />
          <span className="studio-side-splitter-pill studio-side-splitter-pill--muted" />
        </span>
      </div>
      </>
      )}

      {/* Scrollable timeline content */}
      <div
        className={cn(
          'studio-timeline-scroll',
          externalDrop && 'studio-timeline-scroll--drop-active',
          timelineIsEmpty && 'studio-timeline-scroll--empty',
        )}
        ref={scrollRef}
        onScroll={syncHeaderScroll}
        onContextMenu={(e) => openContextMenu(e)}
        onMouseMove={(e) => {
          const scroll = scrollRef.current;
          if (!scroll) return;
          const rect = scroll.getBoundingClientRect();
          setHoverX(e.clientX - rect.left + scroll.scrollLeft);
        }}
        onMouseLeave={() => setHoverX(null)}
        onDragLeave={(e) => {
          if (!scrollRef.current?.contains(e.relatedTarget as Node)) {
            clearExternalDrop();
          }
        }}
        style={{ ['--timeline-grid' as string]: `${pxPerSec}px` }}
      >
        <div className="studio-timeline-content" style={{ width: timelineContentWidth }}>
          {/* Ruler */}
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
            {/* Minor ticks — no label, shorter line */}
            {rulerMinorTicks.map((tick) => (
              <span
                key={`m-${tick}`}
                className="studio-timeline-ruler-minor-tick"
                style={{ left: timeToPx(tick, pxPerSec) }}
                aria-hidden
              />
            ))}

            {/* Major ticks — tall line + label */}
            {rulerMajorTicks.map((tick) => (
              <div
                key={tick}
                className="studio-timeline-ruler-tick"
                style={{ left: timeToPx(tick, pxPerSec) }}
              >
                <span className="studio-timeline-ruler-tick-line" />
                <span className="studio-timeline-ruler-tick-label font-mono">
                  {formatRulerTick(tick, true)}
                </span>
              </div>
            ))}

            {/* Hover time tooltip on ruler */}
            {hoverTime != null && (
              <div
                className="studio-timeline-ruler-hover-time font-mono"
                style={{ left: hoverX ?? 0 }}
                aria-hidden
              >
                {formatRulerTick(hoverTime, true)}
              </div>
            )}
          </div>

          {/* Tracks / empty canvas */}
          <div
            ref={tracksContainerRef}
            className={cn(timelineIsEmpty && 'studio-timeline-empty-canvas')}
            style={{ position: 'relative', minHeight: timelineIsEmpty ? 120 : undefined }}
            onPointerDown={(e) => {
              if (
                !(e.target as HTMLElement).closest('.studio-timeline-clip-block') &&
                !(e.target as HTMLElement).closest('.studio-timeline-playhead')
              ) {
                if (!timelineIsEmpty) beginMarquee(e);
                else seekFromLaneClick(e.clientX);
              }
            }}
            onDragOver={(e) => {
              if (!timelineIsEmpty) return;
              const types = Array.from(e.dataTransfer.types);
              const { trackId, trackType } = resolveEmptyTimelineDrop(
                types,
                e.dataTransfer.files?.length ? Array.from(e.dataTransfer.files) : undefined,
              );
              updateExternalDrop(e, trackId, trackType);
            }}
            onDragLeave={(e) => {
              if (!timelineIsEmpty) return;
              const related = e.relatedTarget as Node | null;
              if (related && e.currentTarget.contains(related)) return;
              clearExternalDrop();
            }}
            onDrop={(e) => {
              if (!timelineIsEmpty) return;
              const types = Array.from(e.dataTransfer.types);
              const { trackId, trackType } = resolveEmptyTimelineDrop(
                types,
                e.dataTransfer.files?.length ? Array.from(e.dataTransfer.files) : undefined,
              );
              void onLaneDrop(e, trackId as TimelineTrackId, trackType);
            }}
          >
          {timelineIsEmpty ? (
            <TimelineEmptyState />
          ) : (
          <>
          {tracks.map((track, trackIndex) => {
            const laneHeight = TRACK_HEIGHT[track.type];
            const muted = timelineTrackMuted[track.id] ?? false;
            const previewHidden = timelineTrackPreviewHidden[track.id] ?? false;
            const clipHeight =
              track.type === 'text' ? Math.max(22, laneHeight - 4) : laneHeight - 4;

            return (
              <div
                key={track.id}
                className={cn(
                  'studio-timeline-lane',
                  `studio-timeline-lane--${track.type}`,
                  externalDrop?.trackId === track.id &&
                    externalDrop.allowed &&
                    'studio-timeline-lane--drop-ok',
                  externalDrop?.trackId === track.id &&
                    !externalDrop.allowed &&
                    'studio-timeline-lane--drop-blocked',
                  externalDrop &&
                    externalDrop.trackId !== track.id &&
                    'studio-timeline-lane--drop-dim',
                  hoverTrackId === track.id && 'studio-timeline-lane--clip-hover',
                )}
                style={{
                  height: laneHeight,
                  // Footage stays fully visible when muted — a mute icon on the
                  // waveform strip communicates it instead of dimming the whole clip.
                  opacity: muted && track.type !== 'video' ? 0.45 : previewHidden ? 0.72 : 1,
                }}
                data-track-index={trackIndex}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.studio-timeline-clip-block')) return;
                  seekFromLaneClick(e.clientX);
                }}
                onContextMenu={(e) => {
                  if ((e.target as HTMLElement).closest('.studio-timeline-clip-block')) return;
                  openContextMenu(e, { trackId: track.id as TimelineTrackId });
                }}
                onDragOver={(e) => onLaneDragOver(e, String(track.id), track.type)}
                onDragLeave={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (related && e.currentTarget.contains(related)) return;
                  setExternalDrop((prev) =>
                    prev?.trackId === track.id ? null : prev,
                  );
                }}
                onDrop={(e) => void onLaneDrop(e, track.id as TimelineTrackId, track.type)}
              >
                {/* Omniclip-style inter-track add indicator (drop zone between lanes) */}
                {trackIndex > 0 && (
                  <div
                    className="studio-timeline-add-track-indicator"
                    data-indicate={
                      externalDrop?.trackId === track.id && externalDrop.allowed
                        ? 'true'
                        : undefined
                    }
                    aria-hidden
                  />
                )}
                {(() => {
                  let laneClips = track.clips;
                  if (dragPreview) {
                    const movingOffTrack =
                      dragPreview.fromTrackId === track.id &&
                      dragPreview.trackId !== dragPreview.fromTrackId;
                    if (movingOffTrack) {
                      laneClips = laneClips.filter((c) => c.id !== dragPreview.clipId);
                    } else if (
                      dragPreview.trackId === track.id &&
                      dragPreview.fromTrackId !== dragPreview.trackId &&
                      !laneClips.some((c) => c.id === dragPreview.clipId)
                    ) {
                      laneClips = [...laneClips, dragPreview.clip];
                    }
                  }

                  return laneClips.map((clip) => {
                  const preview =
                    dragPreview?.clipId === clip.id ? dragPreview : undefined;
                  const clipStart = preview?.start ?? clip.start;
                  const clipDuration = preview?.duration ?? clip.duration;
                  const clipSourceStart = preview?.sourceStart ?? clip.sourceStart;
                  const left = timeToPx(clipStart, pxPerSec);
                  const width = Math.max(28, timeToPx(clipDuration, pxPerSec));
                  const selected = isSelected(track.id, clip.id);
                  // Media + canvas clips are always editable; caption segments need transcript.
                  const canDragClip =
                    Boolean(clip.mediaKind || clip.canvasKind) ||
                    (Boolean(clip.segmentType) && transcriptReady);
                  const filmstripWidth = preview?.filmstripBaseWidth ?? width;

                  const clipThumbs =
                    track.type === 'video' && thumbnails.length > 0 && mediaDuration > 0
                      ? filmstripThumbsForClip(
                          thumbnails,
                          mediaDuration,
                          {
                            sourceStart: clipSourceStart,
                            duration: clipDuration,
                          },
                          filmstripWidth,
                        )
                      : undefined;

                  const waveformClip =
                    preview != null
                      ? { ...clip, start: clipStart, duration: clipDuration, sourceStart: clipSourceStart }
                      : clip;
                  const isInteracting = preview != null;

                  return (
                    <TimelineClipBlock
                      key={clip.id}
                      clip={waveformClip}
                      track={track}
                      left={left}
                      width={width}
                      height={clipHeight}
                      selected={selected}
                      canDrag={canDragClip}
                      interacting={isInteracting}
                      muted={
                        muted ||
                        (track.type === 'video' &&
                          Boolean(videoClips.find((v) => v.id === clip.id)?.muted))
                      }
                      filmstripThumbs={clipThumbs}
                      onSelect={(e) => selectClip(track.id as TimelineTrackId, clip.id, e)}
                      onContextMenu={(e) =>
                        openContextMenu(e, {
                          trackId: track.id as TimelineTrackId,
                          clipId: clip.id,
                        })
                      }
                      onDragStart={(e, mode) =>
                        beginClipDrag(e, track.id, clip, mode, track.clips)
                      }
                    >
                      {isAudioLikeTimelineTrack(String(track.id)) && width > 8 && (
                        <TimelineClipWaveform
                          clip={waveformClip}
                          width={width}
                          height={clipHeight}
                          trackType={track.type}
                          stretchOnly={isInteracting}
                        />
                      )}
                      {track.type === 'video' && width > 8 && (
                        <TimelineClipWaveform
                          clip={waveformClip}
                          width={width}
                          height={Math.max(13, Math.round(clipHeight * 0.42))}
                          trackType={track.type}
                          stretchOnly={isInteracting}
                        />
                      )}
                    </TimelineClipBlock>
                  );
                });
                })()}

                {track.type === 'video' && filmstripLoading && (
                  <div className="studio-timeline-filmstrip-loading">
                    <span>Generating footage…</span>
                    {filmstripProgress > 0 && (
                      <span className="studio-timeline-filmstrip-progress">{filmstripProgress}%</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}



          {marquee && (
            <div
              className="studio-timeline-marquee"
              style={{
                left: Math.min(marquee.x1, marquee.x2),
                top: Math.min(marquee.y1, marquee.y2),
                width: Math.abs(marquee.x2 - marquee.x1),
                height: Math.abs(marquee.y2 - marquee.y1),
              }}
              aria-hidden
            />
          )}
          </>
          )}

          {externalDrop && (
            <>
              <div
                className={cn(
                  'studio-timeline-drop-caret',
                  !externalDrop.allowed && 'is-blocked',
                )}
                style={{ left: externalDrop.x }}
                aria-hidden
              />
              <div
                className={cn(
                  'studio-timeline-drop-hint',
                  !externalDrop.allowed && 'is-blocked',
                )}
                style={{ left: Math.max(8, externalDrop.x - 60) }}
              >
                <span className="font-mono">{formatStudioTimecode(externalDrop.time)}</span>
                <span>{externalDrop.hint}</span>
              </div>
            </>
          )}
          </div>

          {/* Snap indicator line */}
          {snapIndicator && (
            <div
              className="studio-timeline-snap-line"
              style={{ left: snapIndicator.snapX }}
              aria-hidden
            />
          )}

          {/* Hover cursor line */}
          {hoverX != null && !draggingPlayhead && (
            <div
              className="studio-timeline-hover-line"
              style={{ left: hoverX }}
              aria-hidden
            />
          )}

          {/* Beat markers */}
          {showBeatMarkers &&
            beatAnalysis?.beats.map((beatSec, index) => (
              <button
                key={`beat-${index}-${beatSec}`}
                type="button"
                className="studio-timeline-beat-marker"
                style={{ left: timeToPx(beatSec, pxPerSec) }}
                title={`Beat ${index + 1} · ${formatStudioTimecode(beatSec)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTimeline(beatSec);
                }}
                aria-label={`Seek to beat at ${formatStudioTimecode(beatSec)}`}
              />
            ))}

          {/* Auto-cut suggestions */}
          {autoCutSuggestions.map((suggestion) => (
            <button
              key={`cut-${suggestion.timeSec}`}
              type="button"
              className="studio-timeline-cut-marker"
              style={{ left: timeToPx(suggestion.timeSec, pxPerSec) }}
              title={`Suggested cut · ${formatStudioTimecode(suggestion.timeSec)}`}
              onClick={(e) => {
                e.stopPropagation();
                seekTimeline(suggestion.timeSec);
              }}
              aria-label={`Seek to suggested cut at ${formatStudioTimecode(suggestion.timeSec)}`}
            />
          ))}

          {/* Playhead */}
          <div
            className={cn(
              'studio-timeline-playhead',
              draggingPlayhead && 'is-dragging',
              canSplit && 'is-razor-ready',
            )}
            style={{ left: playheadX }}
            title={canSplit ? 'Split ready — press B or use scissors' : undefined}
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
        onSplit={splitAtPlayhead}
        onDelete={deleteSelection}
        onCopy={copySelection}
        onCut={cutSelection}
        onPaste={(atTime) => pasteSelection(atTime)}
        onDuplicate={duplicateSelection}
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
        onAddKeyframe={() => {
          const clipId = contextMenu?.clipId ?? selectedTimelineClip?.clipId;
          if (!clipId) return;
          addClipKeyframe(clipId, contextMenu?.time ?? currentTime);
        }}
        canSplit={canSplit}
        canDelete={canDeleteSelection}
        canEditCanvas={canEditCanvas}
        canAddKeyframe={
          canAddKeyframe ||
          Boolean(
            contextMenu?.clipId &&
              isEditableTimelineTrack(contextMenu.trackId) &&
              !isAudioLikeTimelineTrack(contextMenu.trackId) &&
              contextMenu.trackId !== 'video',
          )
        }
        hasClipboard={hasClipboard}
      />
    </div>
  );
}
