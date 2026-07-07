import { Transformer } from 'react-konva';
import type Konva from 'konva';
import {
  CANVAS_FRAME,
  CORNER_ANCHORS,
  EDGE_ANCHORS,
} from '@/features/studio/lib/canvasFrameTokens';

type TransformBox = { x: number; y: number; width: number; height: number };

interface StudioCanvasTransformerProps {
  transformerRef: React.RefObject<Konva.Transformer | null>;
  keepRatio: boolean;
  boundBoxFunc: (oldBox: TransformBox, newBox: TransformBox) => TransformBox;
}

function styleCapCutAnchor(anchor: Konva.Rect) {
  const name = anchor.name();
  const isCorner = (CORNER_ANCHORS as readonly string[]).includes(name);

  anchor.fill(CANVAS_FRAME.handleFill);
  anchor.stroke(CANVAS_FRAME.handleStroke);
  anchor.strokeWidth(1);
  anchor.shadowColor('transparent');
  anchor.shadowBlur(0);
  anchor.shadowOpacity(0);

  if (isCorner) {
    const size = CANVAS_FRAME.cornerSize;
    anchor.width(size);
    anchor.height(size);
    anchor.offsetX(size / 2);
    anchor.offsetY(size / 2);
    anchor.cornerRadius(size / 2);
    return;
  }

  const isSide = name === 'middle-left' || name === 'middle-right';
  const w = isSide ? CANVAS_FRAME.edgeThin : CANVAS_FRAME.edgeThick;
  const h = isSide ? CANVAS_FRAME.edgeThick : CANVAS_FRAME.edgeThin;
  anchor.width(w);
  anchor.height(h);
  anchor.offsetX(w / 2);
  anchor.offsetY(h / 2);
  anchor.cornerRadius(2);
}

export function StudioCanvasTransformer({
  transformerRef,
  keepRatio,
  boundBoxFunc,
}: StudioCanvasTransformerProps) {
  const enabledAnchors = keepRatio
    ? [...CORNER_ANCHORS]
    : [...CORNER_ANCHORS, ...EDGE_ANCHORS];

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={false}
      keepRatio={keepRatio}
      padding={0}
      flipEnabled={false}
      enabledAnchors={enabledAnchors}
      boundBoxFunc={boundBoxFunc as Konva.TransformerConfig['boundBoxFunc']}
      anchorSize={CANVAS_FRAME.hitArea}
      anchorCornerRadius={999}
      borderEnabled
      borderStroke={CANVAS_FRAME.borderColor}
      borderStrokeWidth={CANVAS_FRAME.borderWidth}
      borderDash={[]}
      ignoreStroke
      anchorFill={CANVAS_FRAME.handleFill}
      anchorStroke={CANVAS_FRAME.handleStroke}
      anchorStyleFunc={styleCapCutAnchor}
    />
  );
}
