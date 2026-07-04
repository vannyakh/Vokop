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
import {
  ImageIcon,
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
  MEDIA_ASSET_DRAG_MIME,
  parseMediaAssetDrag,
} from '@/features/studio/lib/mediaLibrary';
import {
  TEXT_TEMPLATE_DRAG_MIME,
  type TextTemplateInput,
} from '@/features/studio/constants/textTemplates';
import {
  dropHintForTrack,
  isTimelineExternalDrag,
  trackAcceptsDrop,
} from '@/features/studio/lib/timelineDrop';
import { useTranscriptReady } from '@/features/studio/hooks/useTranscriptReady';

interface StudioTimelineProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying?: boolean;
}

const ADD_TRACK_ICONS = {
  image: ImageIcon,
  sticker: Sticker,
  text: Type,
  effect: Sparkles,
  sound: Music2,
  audio: Mic2,
} as const;

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
  const projectId = useAppStore((s) => s.projectId);
  const videoFile = useAppStore((s) => s.videoFile);
  const duration = useAppStore((s) => s.duration);
  const currentTime = useAppStore((s) => s.currentTime);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const timelineZoom = useAppStore((s) => s.timelineZoom);
  const timelineTrackMuted = useAppStore((s) => s.timelineTrackMuted);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const selectedTimelineClips = useAppStore((s) => s.selectedTimelineClips);
  const toggleTimelineTrackMuted = useAppStore((s) => s.toggleTimelineTrackMuted);
  const setSelectedTimelineClip = useAppStore((s) => s.setSelectedTimelineClip);
  const setSelectedTimelineClips = useAppStore((s) => s.setSelectedTimelineClips);
  const addToTimelineSelection = useAppStore((s) => s.addToTimelineSelection);
  const removeFromTimelineSelection = useAppStore((s) => s.removeFromTimelineSelection);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const removeTimelineClip = useAppStore((s) => s.removeTimelineClip);
  const addTimelineClip = useAppStore((s) => s.addTimelineClip);
  const addTimelineTrack = useAppStore((s) => s.addTimelineTrack);
  const removeTimelineTrack = useAppStore((s) => s.removeTimelineTrack);
  const reorderTimelineTracks = useAppStore((s) => s.reorderTimelineTracks);
  const renameTimelineTrack = useAppStore((s) => s.renameTimelineTrack);
  const moveTimelineClipToTrack = useAppStore((s) => s.moveTimelineClipToTrack);
  const addClipKeyframe = useAppStore((s) => s.addClipKeyframe);
  const splitTimelineAtPlayhead = useAppStore((s) => s.splitTimelineAtPlayhead);
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);
  const timelineClipboard = useAppStore((s) => s.timelineClipboard);
  const copyTimelineSelection = useAppStore((s) => s.copyTimelineSelection);
  const cutTimelineSelection = useAppStore((s) => s.cutTimelineSelection);
  const pasteTimelineClipboard = useAppStore((s) => s.pasteTimelineClipboard);
  const duplicateTimelineSelection = useAppStore((s) => s.duplicateTimelineSelection);
  const addMediaAssetToTimeline = useAppStore((s) => s.addMediaAssetToTimeline);
  const addTextTemplate = useAppStore((s) => s.addTextTemplate);
  const importMediaFiles = useAppStore((s) => s.importMediaFiles);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const transcriptReady = useTranscriptReady();

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
  const { thumbnails, loading: filmstripLoading, progress: filmstripProgress, thumbWidth } =
    useVideoFilmstrip(videoFile, duration, videoSessionId);

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
  const timelineContentWidth = Math.max(640, timeToPx(duration || 1, pxPerSec) + 80);
  const playheadX = timeToPx(currentTime, pxPerSec);

  const { beginClipDrag, snapIndicator, hoverTrackId } = useTimelineClipDrag(
    pxPerSec,
    duration,
    tracks,
    tracksContainerRef,
  );

  const rulerTicks = useMemo(() => {
    if (!duration) return [0];
    const ticks: number[] = [];
    for (let t = 0; t <= Math.ceil(duration); t++) ticks.push(t);
    return ticks;
  }, [duration]);

  const seekTimeline = useAppStore((s) => s.seekTimeline);

  const seekTo = useCallback(
    (time: number) => {
      if (!duration) return;
      seekTimeline(time);
    },
    [duration, seekTimeline],
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
      setSelectedTimelineClips([]);
      setSelectedTimelineClip(null);
      selectCanvasElement(null);
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
            const hits: { trackId: TimelineTrackId; clipId: string }[] = [];
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
            if (hits.length) {
              setSelectedTimelineClips(hits);
              setSelectedTimelineClip(hits[0] ?? null);
            }
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
    [tracks, trackTops, pxPerSec, setSelectedTimelineClips, setSelectedTimelineClip, selectCanvasElement],
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
      if (e.key === 'Escape') {
        setSelectedTimelineClip(null);
        setSelectedTimelineClips([]);
        selectCanvasElement(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelectedTimelineClip, setSelectedTimelineClips, selectCanvasElement]);

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

  const openInspector = useCallback(() => {
    setActiveTab('inspector');
    setEditorOpen(true);
  }, [setActiveTab, setEditorOpen]);

  const selectClip = useCallback(
    (trackId: TimelineTrackId, clipId: string, e?: React.MouseEvent) => {
      const item = { trackId, clipId };
      const isMulti = e && (e.shiftKey || e.metaKey || e.ctrlKey);
      const isCanvasClip = useAppStore
        .getState()
        .canvasElements.some((el) => el.id === clipId);

      if (isMulti) {
        const already = selectedTimelineClips.some(
          (c) => c.trackId === trackId && c.clipId === clipId,
        );
        if (already) {
          removeFromTimelineSelection(item);
        } else {
          addToTimelineSelection(item);
          setSelectedTimelineClip(item);
          if (isCanvasClip) selectCanvasElement(clipId);
          else useAppStore.getState().setSelectedCanvasElementId(null);
          openInspector();
        }
        return;
      }
      setSelectedTimelineClips([item]);
      setSelectedTimelineClip(item);
      if (isCanvasClip) selectCanvasElement(clipId);
      else useAppStore.getState().setSelectedCanvasElementId(null);
      openInspector();
    },
    [
      selectedTimelineClips,
      setSelectedTimelineClip,
      setSelectedTimelineClips,
      addToTimelineSelection,
      removeFromTimelineSelection,
      selectCanvasElement,
      openInspector,
    ],
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

      const templateRaw = e.dataTransfer.getData(TEXT_TEMPLATE_DRAG_MIME);
      if (templateRaw) {
        try {
          const template = JSON.parse(templateRaw) as TextTemplateInput;
          addTextTemplate(template, { startTime: atTime, trackId: String(trackId) });
        } catch {
          /* ignore invalid payload */
        }
        return;
      }

      const assetRaw = e.dataTransfer.getData(MEDIA_ASSET_DRAG_MIME);
      if (assetRaw) {
        const parsed = parseMediaAssetDrag(assetRaw);
        if (parsed?.assetId) {
          addMediaAssetToTimeline(parsed.assetId, atTime, { trackId: String(trackId) });
          return;
        }
      }

      if (e.dataTransfer.files?.length) {
        const files = Array.from(e.dataTransfer.files);
        await importMediaFiles(files);
        const assets = useAppStore.getState().mediaAssets;
        const newest = [...assets].reverse().find((asset) => {
          if (trackId === 'video' || trackType === 'video') return asset.kind === 'video';
          if (isAudioLikeTimelineTrack(trackId) || trackType === 'audio' || trackType === 'sound') {
            return asset.kind === 'audio';
          }
          if (isVisualTimelineTrack(trackId) || trackType === 'image' || trackType === 'sticker') {
            return asset.kind === 'image';
          }
          return true;
        });
        if (newest) {
          addMediaAssetToTimeline(newest.id, atTime, { trackId: String(trackId) });
        }
      }
    },
    [
      addMediaAssetToTimeline,
      addTextTemplate,
      clearExternalDrop,
      importMediaFiles,
      timeAtClientX,
    ],
  );

  const canDeleteSelection = isEditableTimelineTrack(selectedTimelineClip?.trackId);

  const canSplitSelection =
    transcriptReady &&
    (selectedTimelineClip?.trackId === 'video' ||
      selectedTimelineClip?.trackId === 'audio' ||
      selectedTimelineClip?.trackId === 'text' ||
      (isVisualTimelineTrack(selectedTimelineClip?.trackId) &&
        Boolean(selectedTimelineClip?.clipId)));

  const hoverTime = hoverX != null ? pxToTime(hoverX, pxPerSec) : null;

  if (!videoUrl && !projectId) return null;

  return (
    <div
      className="studio-timeline-pinned-layout"
      onClick={() => {
        setSelectedTimelineClip(null);
        selectCanvasElement(null);
        setContextMenu(null);
      }}
    >
      {/* Pinned track header column */}
      <div className="studio-timeline-header-col" ref={headerColRef}>
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
            dragging={dragTrackId === track.id}
            dropTarget={dropHeaderTrackId === track.id && dragTrackId !== track.id}
            onToggleMute={() => toggleTimelineTrackMuted(track.id)}
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
                label: opt.label,
                onClick: () => addTimelineTrack(opt.type),
              };
            }),
          }}
        >
          <button type="button" className="studio-track-add-row" title="Add track">
            <Plus size={12} />
            <span>Add track</span>
          </button>
        </Dropdown>
      </div>

      {/* Scrollable timeline content */}
      <div
        className={cn(
          'studio-timeline-scroll',
          externalDrop && 'studio-timeline-scroll--drop-active',
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

            {/* Hover time tooltip on ruler */}
            {hoverTime != null && (
              <div
                className="studio-timeline-ruler-hover-time font-mono"
                style={{ left: hoverX ?? 0 }}
                aria-hidden
              >
                {formatRulerTick(hoverTime)}
              </div>
            )}
          </div>

          {/* Tracks */}
          <div
            ref={tracksContainerRef}
            style={{ position: 'relative' }}
            onPointerDown={(e) => {
              if (
                !(e.target as HTMLElement).closest('.studio-timeline-clip-block') &&
                !(e.target as HTMLElement).closest('.studio-timeline-playhead')
              ) {
                beginMarquee(e);
              }
            }}
          >
          {tracks.map((track, trackIndex) => {
            const laneHeight = TRACK_HEIGHT[track.type];
            const muted = timelineTrackMuted[track.id] ?? false;
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
                style={{ height: laneHeight, opacity: muted ? 0.45 : 1 }}
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
                {track.clips.map((clip) => {
                  const left = timeToPx(clip.start, pxPerSec);
                  const width = Math.max(28, timeToPx(clip.duration, pxPerSec));
                  const selected =
                    (selectedTimelineClip?.clipId === clip.id &&
                      selectedTimelineClip.trackId === track.id) ||
                    selectedTimelineClips.some(
                      (s) => s.clipId === clip.id && s.trackId === track.id,
                    );

                  return (
                    <TimelineClipBlock
                      key={clip.id}
                      clip={clip}
                      track={track}
                      left={left}
                      width={width}
                      height={clipHeight}
                      selected={selected}
                      canDrag={transcriptReady}
                      filmstripThumbs={track.type === 'video' ? thumbnails : undefined}
                      thumbWidth={thumbWidth}
                      onSelect={(e) => selectClip(track.id as TimelineTrackId, clip.id, e)}
                      onDelete={
                        transcriptReady
                          ? () => {
                              removeTimelineClip(track.id, clip.id);
                              selectCanvasElement(null);
                            }
                          : undefined
                      }
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
                  label: opt.label,
                  onClick: () => addTimelineTrack(opt.type),
                };
              }),
            }}
          >
            <button type="button" className="studio-timeline-add-lane" title="Add track">
              <Plus size={14} />
              Add track
            </button>
          </Dropdown>

          {/* Marquee selection box */}
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

          {/* Playhead */}
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
        onCopy={copyTimelineSelection}
        onCut={cutTimelineSelection}
        onPaste={(atTime) => pasteTimelineClipboard(atTime)}
        onDuplicate={duplicateTimelineSelection}
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
        canSplit={canSplitSelection}
        canDelete={canDeleteSelection}
        canEditCanvas={isEditableTimelineTrack(selectedTimelineClip?.trackId)}
        canAddKeyframe={Boolean(
          (contextMenu?.clipId ?? selectedTimelineClip?.clipId) &&
            isEditableTimelineTrack(contextMenu?.trackId ?? selectedTimelineClip?.trackId) &&
            !isAudioLikeTimelineTrack(contextMenu?.trackId ?? selectedTimelineClip?.trackId) &&
            (contextMenu?.trackId ?? selectedTimelineClip?.trackId) !== 'video',
        )}
        hasClipboard={Boolean(timelineClipboard?.length)}
      />
    </div>
  );
}
