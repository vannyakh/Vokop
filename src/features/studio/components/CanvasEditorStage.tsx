import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Text, Group, Rect, Transformer, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useCanvasElementSync } from '@/features/studio/hooks/useCanvasElementSync';
import { isElementVisible } from '@/features/studio/lib/canvasElements';
import type { CanvasElement } from '@/types/canvas';

interface CanvasEditorStageProps {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  onBackgroundClick?: () => void;
}

const PAD = 24;

function useCanvasImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | undefined>();

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  return image;
}

function clampNode(node: Konva.Group, size: { width: number; height: number }) {
  const box = node.getClientRect({ skipTransform: false });
  const maxX = Math.max(PAD, size.width - box.width - PAD);
  const maxY = Math.max(PAD, size.height - box.height - PAD);
  node.x(Math.min(Math.max(PAD, node.x()), maxX));
  node.y(Math.min(Math.max(PAD, node.y()), maxY));
}

function CanvasElementNode({
  element,
  selected,
  canvasTool,
  stageSize,
  onSelect,
  onChange,
}: {
  element: CanvasElement;
  selected: boolean;
  canvasTool: string;
  stageSize: { width: number; height: number };
  onSelect: () => void;
  onChange: (patch: Partial<CanvasElement>) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const isText = element.type === 'text';
  const isImage = element.type === 'logo' || element.type === 'image';
  const image = useCanvasImage(isImage ? element.src : undefined);
  const accent =
    element.type === 'logo' ? '#F4B942' : element.type === 'image' ? '#7EB6FF' : isText ? '#54D6C9' : '#9C8CD8';
  const boxHeight = isImage ? element.height : element.fontSize * 1.6;

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      draggable={canvasTool === 'select'}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => {
        const node = e.target as Konva.Group;
        clampNode(node, stageSize);
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
      {isImage && image ? (
        <>
          <KonvaImage
            image={image}
            width={element.width}
            height={element.height}
            listening={false}
          />
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
          <Rect
            width={element.width}
            height={boxHeight}
            fill={isText ? 'rgba(84,214,201,0.12)' : 'rgba(156,140,216,0.12)'}
            stroke={selected ? accent : 'transparent'}
            strokeWidth={selected ? 1.5 : 0}
            cornerRadius={6}
            listening={false}
          />
          <Text
            text={element.text}
            width={element.width}
            y={4}
            align="center"
            fontSize={element.fontSize}
            fontFamily="var(--font-display, system-ui, sans-serif)"
            fontStyle="600"
            fill="#ffffff"
            shadowColor="rgba(0,0,0,0.85)"
            shadowBlur={10}
            shadowOffsetY={2}
            shadowOpacity={0.9}
            lineHeight={1.3}
            listening={false}
          />
        </>
      )}
    </Group>
  );
}

export function CanvasEditorStage({ wrapRef, onBackgroundClick }: CanvasEditorStageProps) {
  const currentTime = useAppStore((s) => s.currentTime);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const selectedCanvasElementId = useAppStore((s) => s.selectedCanvasElementId);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);

  const [size, setSize] = useState({ width: 0, height: 0 });
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

    if (canvasTool !== 'select' || !selectedCanvasElementId) {
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
  }, [selectedCanvasElementId, canvasTool, canvasElements, currentTime, size]);

  if (size.width <= 0 || size.height <= 0) return null;

  const visibleElements = canvasElements.filter((el) => isElementVisible(el, currentTime));

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      className={cn('studio-canvas-stage', canvasTool === 'pan' && 'studio-canvas-stage--pan')}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) {
          selectCanvasElement(null);
          if (canvasTool === 'pan') onBackgroundClick?.();
        }
      }}
      onTouchStart={(e) => {
        if (e.target === e.target.getStage()) selectCanvasElement(null);
      }}
    >
      <Layer ref={layerRef}>
        {visibleElements.map((element) => (
          <CanvasElementNode
            key={element.id}
            element={element}
            selected={selectedCanvasElementId === element.id}
            canvasTool={canvasTool}
            stageSize={size}
            onSelect={() => selectCanvasElement(element.id)}
            onChange={(patch) => updateCanvasElement(element.id, patch)}
          />
        ))}

        {canvasTool === 'select' && (
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
  );
}
