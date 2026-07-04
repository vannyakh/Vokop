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
import {
  CanvasElementOverlay,
  CanvasInlineTextEditor,
} from '@/features/studio/components/CanvasElementOverlay';
import type { CanvasElement } from '@/types/canvas';

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
  const currentTime = useAppStore((s) => s.currentTime);
  const isText = element.type === 'text' || element.type === 'overlay';
  const isImage = element.type === 'logo' || element.type === 'image';
  const { image, failed } = useCanvasImage(isImage ? element.src : undefined);
  const style = element.textStyle;
  const effectProps = getEffectProps(element.textEffect);
  const accent =
    element.type === 'logo' ? '#F4B942' : element.type === 'image' ? '#7EB6FF' : isText ? '#54D6C9' : '#9C8CD8';
  const animated = sampleElementAtTime(element, currentTime);
  const display = dragging
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
      x={display.x}
      y={display.y}
      rotation={display.rotation}
      opacity={display.opacity}
      draggable={interactive}
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
      onTransformEnd={() => {
        const node = groupRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        clampNode(node, elementSize, contentRect);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(isImage ? 40 : 80, node.width() * scaleX),
          height: Math.max(isImage ? 24 : boxHeight, node.height() * scaleY),
          rotation: node.rotation(),
        });
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

export function CanvasEditorStage({ wrapRef, onBackgroundClick, previewMode = false }: CanvasEditorStageProps) {
  const currentTime = useAppStore((s) => s.currentTime);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const selectedCanvasElementId = useAppStore((s) => s.selectedCanvasElementId);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const canvasPreviewAxis = useAppStore((s) => s.canvasPreviewAxis);
  const canvasAttachSnap = useAppStore((s) => s.canvasAttachSnap);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);

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

  useEffect(() => {
    const tr = transformerRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;

    if (previewMode || !selectedCanvasElementId || editingElementId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const node = layer.findOne(`#${selectedCanvasElementId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedCanvasElementId, canvasElements, currentTime, size, previewMode, editingElementId]);

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
          interactive && selectedCanvasElementId && 'studio-canvas-stage--selecting',
        )}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            selectCanvasElement(null);
            setEditingElementId(null);
            setDragGuides(null);
            if (canvasTool === 'pan' && interactive) onBackgroundClick?.();
          }
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage()) {
            selectCanvasElement(null);
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
              onSelect={() => selectCanvasElement(element.id)}
              onEdit={() => {
                selectCanvasElement(element.id);
                setEditingElementId(element.id);
              }}
              onChange={(patch) => updateCanvasElement(element.id, patch)}
              onDragGuideChange={setDragGuides}
            />
          ))}

          {interactive && selectedCanvasElementId && !editingElementId && (
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
              borderStroke="#54D6C9"
              anchorStroke="#54D6C9"
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
