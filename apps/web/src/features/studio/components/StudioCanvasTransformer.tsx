import { Transformer } from 'react-konva';
import type Konva from 'konva';
import { CANVAS_FRAME } from '@/features/studio/lib/canvasFrameTokens';

type TransformBox = { x: number; y: number; width: number; height: number };

interface StudioCanvasTransformerProps {
  transformerRef: React.RefObject<Konva.Transformer | null>;
  accent: string;
  keepRatio: boolean;
  boundBoxFunc: (oldBox: TransformBox, newBox: TransformBox) => TransformBox;
}

export function StudioCanvasTransformer({
  transformerRef,
  accent,
  keepRatio,
  boundBoxFunc,
}: StudioCanvasTransformerProps) {
  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={false}
      keepRatio={keepRatio}
      padding={0}
      flipEnabled={false}
      enabledAnchors={
        keepRatio
          ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
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
      boundBoxFunc={boundBoxFunc as Konva.TransformerConfig['boundBoxFunc']}
      anchorSize={CANVAS_FRAME.handleSize}
      anchorCornerRadius={999}
      borderStrokeWidth={0}
      borderStroke="transparent"
      anchorStroke={CANVAS_FRAME.handleStroke}
      anchorFill={CANVAS_FRAME.handleFill}
      borderDash={[]}
      ignoreStroke
      anchorStyleFunc={(anchor) => {
        anchor.fill(CANVAS_FRAME.handleFill);
        anchor.stroke(CANVAS_FRAME.handleStroke);
        anchor.strokeWidth(1);
        anchor.cornerRadius(999);
        anchor.shadowColor(CANVAS_FRAME.handleShadow);
        anchor.shadowBlur(5);
        anchor.shadowOffsetY(1);
        anchor.shadowOpacity(0.85);
      }}
    />
  );
}
