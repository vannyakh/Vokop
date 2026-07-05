import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Text, Group, Rect, Transformer, Image as KonvaImage, Line } from 'react-konva';
import type Konva from 'konva';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useCanvasElementSync } from '@/features/studio/hooks/useCanvasElementSync';
import { isElementVisible } from '@/features/studio/lib/canvasElements';
import {
  getVideoContentRect,
  clampToContentRect,
  clampBoxToContentRect,
  toPxBox,
  toFractionBox,
  toPxFontSize,
  toFractionFontSize,
  type CanvasRect,
} from '@/features/studio/lib/canvasCoords';
import { getDisplayRatio } from '@/features/studio/constants/aspectRatios';
import {
  elementToSnapPeer,
  getFrameGuideLines,
  snapBoxEdges,
  snapDragPosition,
  type CanvasGuideLine,
  type SnapPeer,
} from '@/features/studio/lib/canvasSnap';
import { loadStudioFont } from '@/features/studio/lib/fontLoader';
import { getEffectProps } from '@/features/studio/constants/textEffects';
import { sampleElementAtTime } from '@/features/studio/lib/keyframeUtils';
import { findVideoClipForPreview, listVideoTrackIds } from '@/features/studio/lib/mediaClips';
import {
  resolveVideoClipLayout,
  layoutFromKonvaVideoNode,
  videoProxyId,
  type VideoClipLayout,
} from '@/features/studio/lib/videoClipLayout';
import {
  CanvasElementOverlay,
  CanvasInlineTextEditor,
} from '@/features/studio/components/CanvasElementOverlay';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import { studioEdit } from '@/features/studio/services/studioEdit';

interface CanvasEditorStageProps {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  onBackgroundClick?: () => void;
  previewMode?: boolean;
  /** Let HTML drag-and-drop reach the preview frame while dragging media/templates. */
  dropPassthrough?: boolean;
  /** Live-sync DOM video while Konva proxy is dragged or resized. */
  onVideoLiveLayoutChange?: (layout: import('@/features/studio/lib/videoClipLayout').VideoClipLayout | null) => void;
}

const PAD = 4;

function useCanvasImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      setFailed(false);
      return;
    }
    setFailed(false);
    const img = new window.Image();
    img.onload = () => {
      setImage(img);
      setFailed(false);
    };
    img.onerror = () => {
      setImage(undefined);
      setFailed(true);
    };
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { image, failed };
}

function clampNode(node: Konva.Group, boxSize: { width: number; height: number }, content: CanvasRect) {
  const box = clampBoxToContentRect(
    { x: node.x(), y: node.y(), width: boxSize.width, height: boxSize.height },
    content,
    PAD,
  );
  node.x(box.x);
  node.y(box.y);
  return box;
}

function CanvasGuideLines({
  guides,
  stageSize,
}: {
  guides: CanvasGuideLine[];
  stageSize: { width: number; height: number };
}) {
  if (guides.length === 0) return null;

  return (
    <>
      {guides.map((guide, i) => {
        const snapped = Boolean(guide.snapped);
        const isFrame = guide.kind === 'frame';
        return (
          <Line
            key={`${guide.orientation}-${guide.position}-${guide.kind ?? 'g'}-${i}`}
            points={
              guide.orientation === 'vertical'
                ? [guide.position, 0, guide.position, stageSize.height]
                : [0, guide.position, stageSize.width, guide.position]
            }
            stroke={
              snapped
                ? '#54D6C9'
                : isFrame
                  ? 'rgba(244,185,66,0.55)'
                  : 'rgba(84,214,201,0.45)'
            }
            strokeWidth={snapped ? 1.5 : isFrame ? 1 : 1}
            dash={snapped ? undefined : isFrame ? [4, 6] : [6, 4]}
            listening={false}
          />
        );
      })}
    </>
  );
}

function CanvasElementNode({
  element,
  selected,
  interactive,
  contentRect,
  snapPeers,
  canvasPreviewAxis,
  canvasAttachSnap,
  onSelect,
  onEdit,
  onChange,
  onDragGuideChange,
}: {
  element: CanvasElement;
  selected: boolean;
  interactive: boolean;
  contentRect: CanvasRect;
  snapPeers: SnapPeer[];
  canvasPreviewAxis: boolean;
  canvasAttachSnap: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  onDragGuideChange: (guides: CanvasGuideLine[] | null) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const currentTime = useAppStore((s) => s.currentTime);
  const isText = element.type === 'text' || element.type === 'overlay';
  const isImage = element.type === 'logo' || element.type === 'image';
  const { image, failed } = useCanvasImage(isImage ? element.src : undefined);
  const style = element.textStyle;
  const effectProps = getEffectProps(element.textEffect);
  const accent =
    element.type === 'logo' ? '#F4B942' : element.type === 'image' ? '#7EB6FF' : isText ? '#54D6C9' : '#9C8CD8';
  const animated = sampleElementAtTime(element, currentTime);
  // While focused/editing, use authored props so playback keyframes don't fight drag/resize.
  const liveEdit = interactive && (selected || dragging || transforming);
  // element.x/y/width/height (and animated, which is derived from them) are fractions
  // of contentRect — resolved to live on-screen px here, at render time.
  const displayFraction = liveEdit
    ? {
        x: element.x,
        y: element.y,
        opacity: element.opacity,
        rotation: element.rotation,
        width: element.width,
        height: element.height,
      }
    : animated;
  const display = { ...displayFraction, ...toPxBox(displayFraction, contentRect) };
  const fontSizePx = toPxFontSize(element.fontSize, contentRect);
  const boxHeight = isImage ? display.height : fontSizePx * 1.6;
  const displayText =
    style?.textTransform === 'uppercase' ? element.text.toUpperCase() : element.text;

  const resolvedFill = effectProps.fill ?? style?.fill ?? '#ffffff';
  const resolvedFontFamily = element.fontFamily
    ? `${element.fontFamily}, system-ui, sans-serif`
    : 'var(--font-display, system-ui, sans-serif)';

  useEffect(() => {
    if (element.fontFamily) {
      void loadStudioFont(element.fontFamily);
    }
  }, [element.fontFamily]);

  const elementSize = { width: display.width, height: boxHeight };

  const applySnap = (node: Konva.Group) => {
    if (!canvasPreviewAxis && !canvasAttachSnap) {
      onDragGuideChange(null);
      return;
    }

    const snapped = snapDragPosition(
      { x: node.x(), y: node.y() },
      elementSize,
      contentRect,
      snapPeers,
      element.id,
      canvasAttachSnap,
      canvasPreviewAxis,
    );
    node.x(snapped.x);
    node.y(snapped.y);
    onDragGuideChange(snapped.guides);
  };

  return (
    <Group
      ref={groupRef}
      id={element.id}
      name={element.id}
      x={display.x}
      y={display.y}
      width={display.width}
      height={boxHeight}
      rotation={display.rotation}
      opacity={display.opacity}
      draggable={interactive}
      listening={interactive}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (isText) onEdit();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        if (isText) onEdit();
      }}
      onDragStart={() => {
        setDragging(true);
        onSelect();
        if (canvasPreviewAxis) {
          onDragGuideChange(
            snapDragPosition(
              { x: display.x, y: display.y },
              elementSize,
              contentRect,
              snapPeers,
              element.id,
              false,
              true,
            ).guides,
          );
        }
      }}
      onDragMove={(e) => {
        applySnap(e.target as Konva.Group);
      }}
      onDragEnd={(e) => {
        const node = e.target as Konva.Group;
        applySnap(node);
        const box = clampNode(node, elementSize, contentRect);
        onDragGuideChange(null);
        const frac = toFractionBox(box, contentRect);
        onChange({ x: frac.x, y: frac.y });
        setDragging(false);
      }}
      onTransformStart={() => {
        setTransforming(true);
        onSelect();
      }}
      onTransformEnd={() => {
        const node = groupRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        if (isText) {
          const scale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
          const nextFontSizePx = Math.max(10, Math.round(fontSizePx * scale));
          const nextWidth = Math.max(60, display.width * scale);
          const nextHeight = nextFontSizePx * 1.6;
          const box = clampBoxToContentRect(
            { x: node.x(), y: node.y(), width: nextWidth, height: nextHeight },
            contentRect,
            PAD,
            { width: 60, height: 24 },
          );
          node.x(box.x);
          node.y(box.y);
          onChange({
            ...toFractionBox(box, contentRect),
            fontSize: toFractionFontSize(nextFontSizePx, contentRect),
            rotation: node.rotation(),
          });
        } else if (isImage) {
          const scale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
          const nextWidth = Math.max(40, display.width * scale);
          const nextHeight = Math.max(24, display.height * scale);
          const box = clampBoxToContentRect(
            { x: node.x(), y: node.y(), width: nextWidth, height: nextHeight },
            contentRect,
            PAD,
            { width: 40, height: 24 },
          );
          node.x(box.x);
          node.y(box.y);
          onChange({
            ...toFractionBox(box, contentRect),
            rotation: node.rotation(),
          });
        } else {
          const nextWidth = Math.max(isImage ? 40 : 80, display.width * scaleX);
          const nextHeight = Math.max(isImage ? 24 : boxHeight, boxHeight * scaleY);
          const box = clampBoxToContentRect(
            { x: node.x(), y: node.y(), width: nextWidth, height: nextHeight },
            contentRect,
            PAD,
            { width: isImage ? 40 : 80, height: isImage ? 24 : 24 },
          );
          node.x(box.x);
          node.y(box.y);
          onChange({
            ...toFractionBox(box, contentRect),
            rotation: node.rotation(),
          });
        }
        setTransforming(false);
      }}
    >
      {isImage ? (
        <>
          {image ? (
            <KonvaImage
              image={image}
              width={display.width}
              height={display.height}
              listening
            />
          ) : (
            <Rect
              width={display.width}
              height={display.height}
              fill={failed ? 'rgba(232,116,106,0.12)' : 'rgba(255,255,255,0.06)'}
              stroke={failed ? '#e8746a' : 'rgba(255,255,255,0.15)'}
              strokeWidth={1}
              dash={failed ? [4, 4] : undefined}
              listening
            />
          )}
          {selected && (
            <Rect
              width={display.width}
              height={display.height}
              stroke={accent}
              strokeWidth={1.5}
              listening={false}
            />
          )}
        </>
      ) : (
        <>
          {style?.background && (
            <Rect
              width={display.width}
              height={boxHeight}
              fill={style.background}
              cornerRadius={8}
              listening={false}
            />
          )}
          <Rect
            width={display.width}
            height={boxHeight}
            fill={isText && !style?.background ? 'rgba(84,214,201,0.06)' : 'rgba(156,140,216,0.06)'}
            stroke={selected ? accent : 'transparent'}
            strokeWidth={selected && !style?.background ? 1.5 : 0}
            cornerRadius={6}
            opacity={style?.background ? 0 : 1}
            listening
          />
          <Text
            text={displayText}
            width={display.width}
            y={4}
            align={style?.align ?? 'center'}
            fontSize={fontSizePx}
            fontFamily={resolvedFontFamily}
            fontStyle={[
              style?.fontStyle === 'italic' ? 'italic' : '',
              style?.fontWeight === 'bold' ? 'bold' : '',
            ].filter(Boolean).join(' ') || 'normal'}
            fill={resolvedFill}
            letterSpacing={style?.letterSpacing ?? 0}
            stroke={effectProps.stroke ?? style?.stroke}
            strokeWidth={effectProps.strokeWidth ?? style?.strokeWidth ?? 0}
            shadowEnabled={effectProps.shadowEnabled ?? !!(style?.shadowColor)}
            shadowColor={effectProps.shadowColor ?? style?.shadowColor ?? 'rgba(0,0,0,0.7)'}
            shadowBlur={effectProps.shadowBlur ?? style?.shadowBlur ?? 8}
            shadowOffsetX={effectProps.shadowOffsetX ?? 0}
            shadowOffsetY={effectProps.shadowOffsetY ?? (effectProps.shadowEnabled ? 0 : 2)}
            shadowOpacity={effectProps.shadowOpacity ?? (style?.shadowColor ? 1 : 0.7)}
            lineHeight={1.35}
            listening={false}
          />
        </>
      )}
    </Group>
  );
}

/** Invisible Konva proxy so video clips get the same resize/move handles as overlays. */
function VideoClipProxyNode({
  clip,
  contentRect,
  selected,
  interactive,
  snapPeers,
  canvasPreviewAxis,
  canvasAttachSnap,
  onSelect,
  onChange,
  onDragGuideChange,
  onLiveLayoutChange,
}: {
  clip: MediaClip;
  contentRect: CanvasRect;
  selected: boolean;
  interactive: boolean;
  snapPeers: SnapPeer[];
  canvasPreviewAxis: boolean;
  canvasAttachSnap: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<MediaClip>) => void;
  onDragGuideChange: (guides: CanvasGuideLine[] | null) => void;
  onLiveLayoutChange?: (layout: VideoClipLayout | null) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const layout = resolveVideoClipLayout(clip, contentRect);
  const proxyId = videoProxyId(clip.id);
  const live = selected || dragging || transforming;
  const axisMode = canvasPreviewAxis ? 'frame' : 'none';

  const emitLiveLayout = (node: Konva.Group) => {
    onLiveLayoutChange?.(layoutFromKonvaVideoNode(node, layout));
  };

  const clearLiveLayout = () => {
    onLiveLayoutChange?.(null);
  };

  useLayoutEffect(() => {
    if (live) return;
    const node = groupRef.current;
    if (!node) return;
    node.x(layout.x);
    node.y(layout.y);
    node.width(layout.width);
    node.height(layout.height);
    node.rotation(layout.rotation);
    node.scaleX(1);
    node.scaleY(1);
    node.getLayer()?.batchDraw();
  }, [layout.x, layout.y, layout.width, layout.height, layout.rotation, live]);

  const applyDragSnap = (node: Konva.Group) => {
    if (!canvasPreviewAxis && !canvasAttachSnap) {
      onDragGuideChange(null);
      return;
    }
    const snapped = snapDragPosition(
      { x: node.x(), y: node.y() },
      { width: layout.width, height: layout.height },
      contentRect,
      snapPeers,
      proxyId,
      canvasAttachSnap,
      axisMode,
    );
    node.x(snapped.x);
    node.y(snapped.y);
    onDragGuideChange(snapped.guides);
  };

  return (
    <Group
      ref={groupRef}
      id={proxyId}
      name={proxyId}
      x={layout.x}
      y={layout.y}
      width={layout.width}
      height={layout.height}
      rotation={layout.rotation}
      opacity={1}
      draggable={interactive}
      listening={interactive}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragStart={() => {
        setDragging(true);
        onSelect();
        if (canvasPreviewAxis) {
          onDragGuideChange(getFrameGuideLines(contentRect));
        }
      }}
      onDragMove={(e) => {
        const node = e.target as Konva.Group;
        applyDragSnap(node);
        emitLiveLayout(node);
      }}
      onDragEnd={(e) => {
        const node = e.target as Konva.Group;
        applyDragSnap(node);
        onChange({
          x: node.x(),
          y: node.y(),
          width: layout.width,
          height: layout.height,
          rotation: node.rotation(),
        });
        onDragGuideChange(null);
        clearLiveLayout();
        setDragging(false);
      }}
      onTransformStart={() => {
        setTransforming(true);
        onSelect();
        if (canvasPreviewAxis) {
          onDragGuideChange(getFrameGuideLines(contentRect));
        }
      }}
      onTransform={() => {
        const node = groupRef.current;
        if (!node) return;
        emitLiveLayout(node);
        if (!canvasPreviewAxis && !canvasAttachSnap) return;
        const width = Math.max(48, layout.width * node.scaleX());
        const height = Math.max(48, layout.height * node.scaleY());
        const { guides } = snapBoxEdges(
          { x: node.x(), y: node.y(), width, height },
          contentRect,
          snapPeers,
          proxyId,
          canvasAttachSnap,
          axisMode,
        );
        onDragGuideChange(guides);
      }}
      onTransformEnd={() => {
        const node = groupRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        let box = {
          x: node.x(),
          y: node.y(),
          width: Math.max(48, layout.width * scaleX),
          height: Math.max(48, layout.height * scaleY),
        };
        if (canvasAttachSnap || canvasPreviewAxis) {
          const snapped = snapBoxEdges(
            box,
            contentRect,
            snapPeers,
            proxyId,
            canvasAttachSnap,
            axisMode,
          );
          box = snapped.box;
        }
        box = clampBoxToContentRect(box, contentRect, PAD, { width: 48, height: 48 });
        node.x(box.x);
        node.y(box.y);
        onChange({
          ...box,
          rotation: node.rotation(),
        });
        onDragGuideChange(null);
        clearLiveLayout();
        setTransforming(false);
      }}
    >
      <Rect
        width={layout.width}
        height={layout.height}
        fill="rgba(0,0,0,0.01)"
        stroke={selected ? '#F4B942' : 'transparent'}
        strokeWidth={selected ? 1.5 : 0}
        listening
      />
    </Group>
  );
}

export function CanvasEditorStage({
  wrapRef,
  onBackgroundClick,
  previewMode = false,
  dropPassthrough = false,
  onVideoLiveLayoutChange,
}: CanvasEditorStageProps) {
  const currentTime = useAppStore((s) => s.currentTime);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const selectedCanvasElementId = useAppStore((s) => s.selectedCanvasElementId);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const videoClips = useAppStore((s) => s.videoClips);
  const extraTimelineTracks = useAppStore((s) => s.extraTimelineTracks);
  const timelineTrackOrder = useAppStore((s) => s.timelineTrackOrder);
  const timelineTrackHidden = useAppStore((s) => s.timelineTrackHidden);
  const timelineTrackPreviewHidden = useAppStore((s) => s.timelineTrackPreviewHidden);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const canvasPreviewAxis = useAppStore((s) => s.canvasPreviewAxis);
  const canvasAttachSnap = useAppStore((s) => s.canvasAttachSnap);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const compositionSpace = useAppStore((s) => s.compositionSpace);
  const migrateCompositionSpaceToFraction = useAppStore((s) => s.migrateCompositionSpaceToFraction);
  const focusCanvasElement = (id: string) => studioEdit.focusCanvasElement(id);
  const focusVideoClip = (clipId: string) => studioEdit.focusVideoClip(clipId);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragGuides, setDragGuides] = useState<CanvasGuideLine[] | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const frameRatio = getDisplayRatio(aspectRatio, videoWidth, videoHeight);
  const contentRect = useMemo(
    () => getVideoContentRect(size, { width: videoWidth, height: videoHeight }, frameRatio),
    [size, videoWidth, videoHeight, frameRatio],
  );

  // Reference frame for default caption placement — the content rect, since
  // canvas element x/y/width/height/fontSize are fractions of it.
  useCanvasElementSync(contentRect.width, contentRect.height);

  // One-time migration for legacy (pre-fraction) projects — runs once the live
  // contentRect is known, then flips the marker so it never runs again.
  useEffect(() => {
    if (compositionSpace === 'fraction-v2') return;
    if (contentRect.width <= 0 || contentRect.height <= 0) return;
    migrateCompositionSpaceToFraction(contentRect);
  }, [compositionSpace, contentRect, migrateCompositionSpaceToFraction]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const update = () => {
      const rect = wrap.getBoundingClientRect();
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wrapRef]);

  const videoTrackIds = useMemo(
    () => listVideoTrackIds(extraTimelineTracks, timelineTrackOrder, timelineTrackHidden),
    [extraTimelineTracks, timelineTrackOrder, timelineTrackHidden],
  );

  const videoClipAtPlayhead = useMemo(
    () =>
      findVideoClipForPreview(
        videoClips,
        currentTime,
        videoTrackIds,
        timelineTrackPreviewHidden,
      ),
    [videoClips, currentTime, videoTrackIds, timelineTrackPreviewHidden],
  );
  const videoSelected =
    selectedTimelineClip?.trackId === 'video' &&
    videoClipAtPlayhead != null &&
    selectedTimelineClip.clipId === videoClipAtPlayhead.id;
  const transformTargetId = selectedCanvasElementId
    ? selectedCanvasElementId
    : videoSelected && videoClipAtPlayhead
      ? videoProxyId(videoClipAtPlayhead.id)
      : null;

  useEffect(() => {
    const tr = transformerRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;

    if (previewMode || !transformTargetId || editingElementId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    // Function matcher avoids CSS selector issues with special characters in ids.
    const node = layer.findOne(
      (n) => n.id() === transformTargetId || n.name() === transformTargetId,
    );
    if (node) {
      tr.nodes([node]);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [
    transformTargetId,
    canvasElements,
    videoClips,
    size,
    previewMode,
    editingElementId,
    videoSelected,
  ]);

  useEffect(() => {
    if (!selectedCanvasElementId) setEditingElementId(null);
  }, [selectedCanvasElementId]);

  const visibleElements = useMemo(
    () =>
      canvasElements.filter((el) => {
        if (!isElementVisible(el, currentTime)) return false;
        const trackId =
          el.trackId ??
          (el.type === 'text' || el.type === 'overlay'
            ? 'text'
            : el.type === 'logo' || el.type === 'image'
              ? 'image'
              : undefined);
        if (trackId && timelineTrackPreviewHidden[trackId]) return false;
        return true;
      }),
    [canvasElements, currentTime, timelineTrackPreviewHidden],
  );
  const overlaySnapPeers = useMemo(
    () => visibleElements.map((el) => elementToSnapPeer(el, contentRect)),
    [visibleElements, contentRect],
  );
  const videoSnapPeer = useMemo((): SnapPeer | null => {
    if (!videoClipAtPlayhead) return null;
    const layout = resolveVideoClipLayout(videoClipAtPlayhead, contentRect);
    return {
      id: videoProxyId(videoClipAtPlayhead.id),
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    };
  }, [videoClipAtPlayhead, contentRect]);
  const overlayPeersWithVideo = useMemo(() => {
    if (!videoSnapPeer) return overlaySnapPeers;
    return [...overlaySnapPeers, videoSnapPeer];
  }, [overlaySnapPeers, videoSnapPeer]);
  const videoSnapPeers = overlaySnapPeers;

  if (size.width <= 0 || size.height <= 0) return null;

  const selectedElement = canvasElements.find((el) => el.id === selectedCanvasElementId) ?? null;
  const editingElement = canvasElements.find((el) => el.id === editingElementId) ?? null;
  const interactive = !previewMode;
  const transformAccent = videoSelected ? '#F4B942' : '#54D6C9';
  const transformKeepRatio = Boolean(
    selectedElement &&
      (selectedElement.type === 'text' ||
        selectedElement.type === 'overlay' ||
        selectedElement.type === 'logo' ||
        selectedElement.type === 'image'),
  );

  // Frame guide lines while the video clip is focused (even before drag).
  const selectionGuides =
    interactive && videoSelected && canvasPreviewAxis && !dragGuides
      ? getFrameGuideLines(contentRect)
      : null;
  const activeGuides = dragGuides ?? selectionGuides;

  return (
    <>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className={cn(
          'studio-canvas-stage',
          canvasTool === 'pan' && interactive && 'studio-canvas-stage--pan',
          previewMode && 'studio-canvas-stage--preview',
          dropPassthrough && 'studio-canvas-stage--drop-passthrough',
          interactive && transformTargetId && 'studio-canvas-stage--selecting',
        )}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            studioEdit.clearFocus();
            setEditingElementId(null);
            setDragGuides(null);
            if (canvasTool === 'pan' && interactive) onBackgroundClick?.();
          }
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage()) {
            studioEdit.clearFocus();
            setEditingElementId(null);
          }
        }}
      >
        <Layer ref={layerRef} listening={interactive}>
          <Rect
            x={contentRect.x}
            y={contentRect.y}
            width={contentRect.width}
            height={contentRect.height}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
            listening={false}
          />

          {/* Video sits under the stage in the DOM; this proxy receives Konva transform handles. */}
          {interactive && videoClipAtPlayhead && (
            <VideoClipProxyNode
              clip={videoClipAtPlayhead}
              contentRect={contentRect}
              selected={videoSelected}
              interactive={interactive}
              snapPeers={videoSnapPeers}
              canvasPreviewAxis={canvasPreviewAxis}
              canvasAttachSnap={canvasAttachSnap}
              onSelect={() => focusVideoClip(videoClipAtPlayhead.id)}
              onChange={(patch) => {
                // VideoClipProxyNode always reports a full live on-screen px box;
                // store fields are fractions of contentRect.
                const box = {
                  x: patch.x ?? 0,
                  y: patch.y ?? 0,
                  width: patch.width ?? 0,
                  height: patch.height ?? 0,
                };
                studioEdit.updateVideoTransform(
                  videoClipAtPlayhead.id,
                  { ...toFractionBox(box, contentRect), rotation: patch.rotation },
                  { history: true },
                );
              }}
              onDragGuideChange={setDragGuides}
              onLiveLayoutChange={onVideoLiveLayoutChange}
            />
          )}

          {activeGuides && (
            <CanvasGuideLines guides={activeGuides} stageSize={size} />
          )}

          {visibleElements.map((element) => (
            <CanvasElementNode
              key={element.id}
              element={element}
              selected={interactive && selectedCanvasElementId === element.id}
              interactive={interactive}
              contentRect={contentRect}
              snapPeers={overlayPeersWithVideo}
              canvasPreviewAxis={canvasPreviewAxis}
              canvasAttachSnap={canvasAttachSnap}
              onSelect={() => focusCanvasElement(element.id)}
              onEdit={() => {
                focusCanvasElement(element.id);
                setEditingElementId(element.id);
              }}
              onChange={(patch) => studioEdit.updateCanvasElement(element.id, patch)}
              onDragGuideChange={setDragGuides}
            />
          ))}

          {interactive && transformTargetId && !editingElementId && (
            <Transformer
              ref={transformerRef}
              rotateEnabled
              rotateAnchorOffset={28}
              keepRatio={transformKeepRatio}
              enabledAnchors={
                transformKeepRatio
                  ? [
                      'top-left',
                      'top-right',
                      'bottom-left',
                      'bottom-right',
                    ]
                  : [
                      'top-left',
                      'top-right',
                      'bottom-left',
                      'bottom-right',
                      'middle-left',
                      'middle-right',
                      'top-center',
                      'bottom-center',
                    ]
              }
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 40 || newBox.height < 24) return oldBox;
                const clamped = clampBoxToContentRect(newBox, contentRect, PAD);
                return { ...newBox, ...clamped };
              }}
              anchorSize={8}
              anchorCornerRadius={1}
              borderStrokeWidth={1.5}
              borderStroke={transformAccent}
              anchorStroke="#ffffff"
              anchorFill="#ffffff"
              borderDash={[]}
              ignoreStroke
            />
          )}
        </Layer>
      </Stage>

      {interactive && selectedElement && !editingElementId && (
        <CanvasElementOverlay
          element={selectedElement}
          contentRect={contentRect}
          stageSize={size}
          onEditText={() => setEditingElementId(selectedElement.id)}
        />
      )}

      {interactive && editingElement && (
        <CanvasInlineTextEditor
          element={editingElement}
          contentRect={contentRect}
          onCommit={(text) => {
            studioEdit.updateCanvasElement(editingElement.id, { text });
            setEditingElementId(null);
          }}
          onCancel={() => setEditingElementId(null)}
        />
      )}
    </>
  );
}
