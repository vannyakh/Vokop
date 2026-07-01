import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Text, Group, Rect, Transformer, Image as KonvaImage, Line } from 'react-konva';
import type Konva from 'konva';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useCanvasElementSync } from '@/features/studio/hooks/useCanvasElementSync';
import { isElementVisible } from '@/features/studio/lib/canvasElements';
import { snapDragPosition, type CanvasGuideLine } from '@/features/studio/lib/canvasSnap';
import { loadGoogleFont } from '@/features/studio/lib/googleFontLoader';
import { getEffectProps } from '@/features/studio/constants/textEffects';
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

const PAD = 24;

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

function clampNode(node: Konva.Group, size: { width: number; height: number }) {
  const box = node.getClientRect({ skipTransform: false });
  const maxX = Math.max(PAD, size.width - box.width - PAD);
  const maxY = Math.max(PAD, size.height - box.height - PAD);
  node.x(Math.min(Math.max(PAD, node.x()), maxX));
  node.y(Math.min(Math.max(PAD, node.y()), maxY));
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
  stageSize,
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
  stageSize: { width: number; height: number };
  snapPeers: CanvasElement[];
  canvasPreviewAxis: boolean;
  canvasAttachSnap: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  onDragGuideChange: (guides: CanvasGuideLine[] | null) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const isText = element.type === 'text' || element.type === 'overlay';
  const isImage = element.type === 'logo' || element.type === 'image';
  const { image, failed } = useCanvasImage(isImage ? element.src : undefined);
  const style = element.textStyle;
  const effectProps = getEffectProps(element.textEffect);
  const accent =
    element.type === 'logo' ? '#F4B942' : element.type === 'image' ? '#7EB6FF' : isText ? '#54D6C9' : '#9C8CD8';
  const boxHeight = isImage ? element.height : element.fontSize * 1.6;
  const displayText =
    style?.textTransform === 'uppercase' ? element.text.toUpperCase() : element.text;

  const resolvedFill = effectProps.fill ?? style?.fill ?? '#ffffff';
  const resolvedFontFamily = element.fontFamily
    ? `${element.fontFamily}, system-ui, sans-serif`
    : 'var(--font-display, system-ui, sans-serif)';

  useEffect(() => {
    if (element.fontFamily) {
      void loadGoogleFont(element.fontFamily);
    }
  }, [element.fontFamily]);

  const elementSize = { width: element.width, height: boxHeight };

  const applySnap = (node: Konva.Group) => {
    if (!canvasPreviewAxis && !canvasAttachSnap) {
      onDragGuideChange(null);
      return;
    }

    const snapped = snapDragPosition(
      { x: node.x(), y: node.y() },
      elementSize,
      stageSize,
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
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
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
        if (canvasPreviewAxis) {
          onDragGuideChange(
            snapDragPosition(
              { x: element.x, y: element.y },
              elementSize,
              stageSize,
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
        clampNode(node, stageSize);
        onDragGuideChange(null);
        onChange({ x: node.x(), y: node.y() });
      }}
      onTransformEnd={() => {
        const node = groupRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        clampNode(node, stageSize);
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
              width={element.width}
              height={element.height}
              listening
            />
          ) : (
            <Rect
              width={element.width}
              height={element.height}
              fill={failed ? 'rgba(232,116,106,0.12)' : 'rgba(255,255,255,0.06)'}
              stroke={failed ? '#e8746a' : 'rgba(255,255,255,0.15)'}
              strokeWidth={1}
              dash={failed ? [4, 4] : undefined}
              listening
            />
          )}
          {selected && (
            <Rect
              width={element.width}
              height={element.height}
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
              width={element.width}
              height={boxHeight}
              fill={style.background}
              cornerRadius={8}
              listening={false}
            />
          )}
          <Rect
            width={element.width}
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
            width={element.width}
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
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragGuides, setDragGuides] = useState<CanvasGuideLine[] | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

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
          {dragGuides && <CanvasGuideLines guides={dragGuides} stageSize={size} />}

          {visibleElements.map((element) => (
            <CanvasElementNode
              key={element.id}
              element={element}
              selected={interactive && selectedCanvasElementId === element.id}
              interactive={interactive}
              stageSize={size}
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
