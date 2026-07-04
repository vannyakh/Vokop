import { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Text, Group, Rect, Transformer, Image as KonvaImage, Line } from 'react-konva';
import type Konva from 'konva';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useCanvasElementSync } from '@/features/studio/hooks/useCanvasElementSync';
import { isElementVisible } from '@/features/studio/lib/canvasElements';
import { getVideoContentRect, clampToContentRect, type CanvasRect } from '@/features/studio/lib/canvasCoords';
import { getDisplayRatio } from '@/features/studio/constants/aspectRatios';
import { snapDragPosition, type CanvasGuideLine } from '@/features/studio/lib/canvasSnap';
import { loadStudioFont } from '@/features/studio/lib/fontLoader';
import { getEffectProps } from '@/features/studio/constants/textEffects';
import { sampleElementAtTime } from '@/features/studio/lib/keyframeUtils';
import { findClipAtTime } from '@/features/studio/lib/mediaClips';
import {
  resolveVideoClipLayout,
  videoProxyId,
} from '@/features/studio/lib/videoClipLayout';
import {
  CanvasElementOverlay,
  CanvasInlineTextEditor,
} from '@/features/studio/components/CanvasElementOverlay';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

interface CanvasEditorStageProps {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  onBackgroundClick?: () => void;
  previewMode?: boolean;
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
  const clamped = clampToContentRect(node.x(), node.y(), boxSize, content, PAD);
  node.x(clamped.x);
  node.y(clamped.y);
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
      {guides.map((guide, i) => (
        <Line
          key={`${guide.orientation}-${guide.position}-${i}`}
          points={
            guide.orientation === 'vertical'
              ? [guide.position, 0, guide.position, stageSize.height]
              : [0, guide.position, stageSize.width, guide.position]
          }
          stroke={guide.snapped ? '#54D6C9' : 'rgba(84,214,201,0.45)'}
          strokeWidth={guide.snapped ? 1.5 : 1}
          dash={guide.snapped ? undefined : [6, 4]}
          listening={false}
        />
      ))}
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
  snapPeers: CanvasElement[];
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
  const display = liveEdit
    ? {
        x: element.x,
        y: element.y,
        opacity: element.opacity,
        rotation: element.rotation,
        width: element.width,
        height: element.height,
      }
    : animated;
  const boxHeight = isImage ? display.height : element.fontSize * 1.6;
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
              { x: element.x, y: element.y },
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
        clampNode(node, elementSize, contentRect);
        onDragGuideChange(null);
        onChange({ x: node.x(), y: node.y() });
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
        const nextWidth = Math.max(isImage ? 40 : 80, display.width * scaleX);
        const nextHeight = Math.max(isImage ? 24 : boxHeight, boxHeight * scaleY);
        clampNode(node, { width: nextWidth, height: nextHeight }, contentRect);
        onChange({
          x: node.x(),
          y: node.y(),
          width: nextWidth,
          height: nextHeight,
          rotation: node.rotation(),
        });
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
            fontSize={element.fontSize}
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
  onSelect,
  onChange,
}: {
  clip: MediaClip;
  contentRect: CanvasRect;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<MediaClip>) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const layout = resolveVideoClipLayout(clip, contentRect);
  const proxyId = videoProxyId(clip.id);
  const live = selected || dragging || transforming;

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
      }}
      onDragEnd={(e) => {
        const node = e.target as Konva.Group;
        onChange({
          x: node.x(),
          y: node.y(),
          width: layout.width,
          height: layout.height,
          rotation: node.rotation(),
        });
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
        const width = Math.max(48, layout.width * scaleX);
        const height = Math.max(48, layout.height * scaleY);
        onChange({
          x: node.x(),
          y: node.y(),
          width,
          height,
          rotation: node.rotation(),
        });
        setTransforming(false);
      }}
    >
      <Rect
        width={layout.width}
        height={layout.height}
        fill={live ? 'rgba(244,185,66,0.06)' : 'rgba(0,0,0,0.01)'}
        stroke={selected ? '#F4B942' : 'transparent'}
        strokeWidth={selected ? 1.5 : 0}
        listening
      />
    </Group>
  );
}

export function CanvasEditorStage({ wrapRef, onBackgroundClick, previewMode = false }: CanvasEditorStageProps) {
  const currentTime = useAppStore((s) => s.currentTime);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const selectedCanvasElementId = useAppStore((s) => s.selectedCanvasElementId);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const videoClips = useAppStore((s) => s.videoClips);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const canvasPreviewAxis = useAppStore((s) => s.canvasPreviewAxis);
  const canvasAttachSnap = useAppStore((s) => s.canvasAttachSnap);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);
  const updateMediaClip = useAppStore((s) => s.updateMediaClip);
  const selectTimelineClip = useAppStore((s) => s.selectTimelineClip);
  const clearTimelineSelection = useAppStore((s) => s.clearTimelineSelection);
  const setTimelinePlaying = useAppStore((s) => s.setTimelinePlaying);

  const focusCanvasElement = (id: string) => {
    // Pause composition playback so Konva selection / transform stays stable.
    if (useAppStore.getState().isTimelinePlaying) {
      setTimelinePlaying(false);
    }
    selectCanvasElement(id);
  };

  const focusVideoClip = (clipId: string) => {
    if (useAppStore.getState().isTimelinePlaying) {
      setTimelinePlaying(false);
    }
    selectTimelineClip(
      { trackId: 'video', clipId },
      { mode: 'replace', syncCanvas: true, openInspector: true },
    );
  };

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragGuides, setDragGuides] = useState<CanvasGuideLine[] | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const contentRectRef = useRef<CanvasRect | null>(null);

  const frameRatio = getDisplayRatio(aspectRatio, videoWidth, videoHeight);
  const contentRect = useMemo(
    () => getVideoContentRect(size, { width: videoWidth, height: videoHeight }, frameRatio),
    [size, videoWidth, videoHeight, frameRatio],
  );

  useCanvasElementSync(size.width, size.height);

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

  const videoClipAtPlayhead = useMemo(
    () => findClipAtTime(videoClips, currentTime),
    [videoClips, currentTime],
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

  useEffect(() => {
    if (previewMode || contentRect.width <= 0) return;
    const prev = contentRectRef.current;
    const changed =
      !prev ||
      prev.x !== contentRect.x ||
      prev.y !== contentRect.y ||
      prev.width !== contentRect.width ||
      prev.height !== contentRect.height;
    contentRectRef.current = contentRect;
    if (!changed) return;

    for (const el of useAppStore.getState().canvasElements) {
      const h = el.type === 'logo' || el.type === 'image' ? el.height : el.fontSize * 1.6;
      const clamped = clampToContentRect(el.x, el.y, { width: el.width, height: h }, contentRect, PAD);
      if (Math.abs(clamped.x - el.x) > 0.5 || Math.abs(clamped.y - el.y) > 0.5) {
        updateCanvasElement(el.id, clamped);
      }
    }
  }, [contentRect, previewMode, updateCanvasElement]);

  if (size.width <= 0 || size.height <= 0) return null;

  const visibleElements = canvasElements.filter((el) => isElementVisible(el, currentTime));
  const selectedElement = canvasElements.find((el) => el.id === selectedCanvasElementId) ?? null;
  const editingElement = canvasElements.find((el) => el.id === editingElementId) ?? null;
  const interactive = !previewMode;
  const transformAccent = videoSelected ? '#F4B942' : '#54D6C9';

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
          interactive && transformTargetId && 'studio-canvas-stage--selecting',
        )}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            clearTimelineSelection({ clearCanvas: true });
            setEditingElementId(null);
            setDragGuides(null);
            if (canvasTool === 'pan' && interactive) onBackgroundClick?.();
          }
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage()) {
            clearTimelineSelection({ clearCanvas: true });
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
            stroke="rgba(255,255,255,0.08)"
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
              onSelect={() => focusVideoClip(videoClipAtPlayhead.id)}
              onChange={(patch) =>
                updateMediaClip(videoClipAtPlayhead.id, patch, { history: true })
              }
            />
          )}

          {dragGuides && <CanvasGuideLines guides={dragGuides} stageSize={size} />}

          {visibleElements.map((element) => (
            <CanvasElementNode
              key={element.id}
              element={element}
              selected={interactive && selectedCanvasElementId === element.id}
              interactive={interactive}
              contentRect={contentRect}
              snapPeers={visibleElements}
              canvasPreviewAxis={canvasPreviewAxis}
              canvasAttachSnap={canvasAttachSnap}
              onSelect={() => focusCanvasElement(element.id)}
              onEdit={() => {
                focusCanvasElement(element.id);
                setEditingElementId(element.id);
              }}
              onChange={(patch) => updateCanvasElement(element.id, patch)}
              onDragGuideChange={setDragGuides}
            />
          ))}

          {interactive && transformTargetId && !editingElementId && (
            <Transformer
              ref={transformerRef}
              rotateEnabled
              enabledAnchors={[
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
                'middle-left',
                'middle-right',
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 40 || newBox.height < 24) return oldBox;
                return newBox;
              }}
              anchorSize={7}
              borderStroke={transformAccent}
              anchorStroke={transformAccent}
              anchorFill="#0B0A08"
            />
          )}
        </Layer>
      </Stage>

      {interactive && selectedElement && !editingElementId && (
        <CanvasElementOverlay
          element={selectedElement}
          stageSize={size}
          onEditText={() => setEditingElementId(selectedElement.id)}
        />
      )}

      {interactive && editingElement && (
        <CanvasInlineTextEditor
          element={editingElement}
          onCommit={(text) => {
            updateCanvasElement(editingElement.id, { text });
            setEditingElementId(null);
          }}
          onCancel={() => setEditingElementId(null)}
        />
      )}
    </>
  );
}
