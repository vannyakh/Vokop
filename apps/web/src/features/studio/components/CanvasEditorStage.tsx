import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Text, Group, Rect, Image as KonvaImage, Line } from 'react-konva';
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
  guidesEqual,
  type CanvasGuideLine,
  type SnapPeer,
} from '@/features/studio/lib/canvasSnap';
import {
  applyKonvaResizeSnap,
  createSnapSession,
  mergeFrameAndSnapGuides,
  snapPreviewDrag,
  type SnapSession,
} from '@/features/studio/lib/previewSnapBridge';
import { usePreviewViewportContext } from '@/features/studio/context/PreviewViewportContext';
import { loadStudioFont } from '@/features/studio/lib/fontLoader';
import { resolveStudioFontStack } from '@/features/studio/fonts/fontStack';
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
  CanvasInlineTextEditor,
} from '@/features/studio/components/CanvasElementOverlay';
import {
  CanvasContextMenu,
  type CanvasContextTarget,
} from '@/features/studio/components/CanvasContextMenu';
import { CanvasSelectionToolbar } from '@/features/studio/components/CanvasSelectionToolbar';
import { CanvasCropOverlay } from '@/features/studio/components/CanvasCropOverlay';
import { CanvasRotationHandle } from '@/features/studio/components/CanvasRotationHandle';
import { StudioCanvasTransformer } from '@/features/studio/components/StudioCanvasTransformer';
import {
  normalizeRotationDegrees,
  type CanvasOrientedBox,
} from '@/features/studio/lib/canvasTransformUtils';
import { resolveCanvasContextHit } from '@/features/studio/lib/canvasContextHit';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import { studioEdit } from '@/features/studio/services/studioEdit';
import {
  FULL_CROP,
  combineCrop,
  isFullCrop,
  type NormalizedCropRect,
} from '@vokop/shared/types/crop';

interface CanvasEditorStageProps {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  onBackgroundClick?: () => void;
  previewMode?: boolean;
  /** Let HTML drag-and-drop reach the preview frame while dragging media/templates. */
  dropPassthrough?: boolean;
  /** WASM compositor draws text/image pixels — Konva keeps selection handles only. */
  compositorOwnsLayerPixels?: boolean;
  /** Live-sync DOM video while Konva proxy is dragged or resized. */
  onVideoLiveLayoutChange?: (layout: import('@/features/studio/lib/videoClipLayout').VideoClipLayout | null) => void;
}

const PAD = 4;

function isShiftHeld(evt: Event): boolean {
  return 'shiftKey' in evt && Boolean((evt as PointerEvent).shiftKey);
}

function bakeKonvaScaleBox(
  node: Konva.Group,
  minSize: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const scaleX = Math.abs(node.scaleX());
  const scaleY = Math.abs(node.scaleY());
  const baseWidth = node.width();
  const baseHeight = node.height();
  node.scaleX(1);
  node.scaleY(1);
  return {
    x: node.x(),
    y: node.y(),
    width: Math.max(minSize.width, baseWidth * scaleX),
    height: Math.max(minSize.height, baseHeight * scaleY),
  };
}

function runDragSnap(
  node: Konva.Group,
  size: { width: number; height: number },
  excludeId: string,
  session: SnapSession,
  peers: readonly SnapPeer[],
  frameSnap: boolean,
  attachSnap: boolean,
): { x: number; y: number; guides: CanvasGuideLine[] } {
  return snapPreviewDrag({
    pos: { x: node.x(), y: node.y() },
    size,
    rotationDeg: node.rotation(),
    session,
    peers,
    excludeId,
    frameSnap,
    attachSnap,
  });
}

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
  guides: readonly CanvasGuideLine[];
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
  snapSession,
  onSelect,
  onEdit,
  onChange,
  onDragGuideChange,
  onLiveLayoutChange,
  hidePixelContent = false,
}: {
  element: CanvasElement;
  selected: boolean;
  interactive: boolean;
  contentRect: CanvasRect;
  snapPeers: SnapPeer[];
  canvasPreviewAxis: boolean;
  canvasAttachSnap: boolean;
  snapSession: SnapSession;
  onSelect: () => void;
  onEdit: () => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  onDragGuideChange: (guides: CanvasGuideLine[] | null) => void;
  onLiveLayoutChange?: (box: CanvasOrientedBox | null) => void;
  hidePixelContent?: boolean;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const currentTime = useAppStore((s) => s.currentTime);
  const cropSession = useAppStore((s) => s.cropSession);
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
  const gradient = !effectProps.fill ? style?.fillGradient : undefined;
  const gradientPoints = gradient
    ? gradient.direction === 'vertical'
      ? { start: { x: 0, y: 0 }, end: { x: 0, y: fontSizePx * (style?.lineHeight ?? 1.35) } }
      : { start: { x: 0, y: 0 }, end: { x: display.width, y: 0 } }
    : undefined;
  const shadowAngleRad = ((style?.shadowAngle ?? 45) * Math.PI) / 180;
  const shadowDistance = style?.shadowDistance ?? 0;
  const manualShadowOffsetX = shadowDistance ? Math.cos(shadowAngleRad) * shadowDistance : 0;
  const manualShadowOffsetY = shadowDistance
    ? Math.sin(shadowAngleRad) * shadowDistance
    : style?.shadowColor
      ? 0
      : 2;
  const resolvedFontFamily = resolveStudioFontStack(element.fontFamily, 'var(--font-display, system-ui, sans-serif)');

  useEffect(() => {
    if (element.fontFamily) {
      void loadStudioFont(element.fontFamily, {
        fontWeight: element.textStyle?.fontWeight,
        fontStyle: element.textStyle?.fontStyle,
      });
    }
  }, [element.fontFamily, element.textStyle?.fontWeight, element.textStyle?.fontStyle]);

  const elementSize = { width: display.width, height: boxHeight };
  const live = dragging || transforming;
  const transformUniform = isText || isImage;
  const effectiveCrop: NormalizedCropRect | undefined = useMemo(() => {
    if (!isImage) return element.crop;
    if (cropSession?.kind === 'element' && cropSession.targetId === element.id) {
      return combineCrop(element.crop ?? FULL_CROP, cropSession.rect);
    }
    return element.crop;
  }, [isImage, element.crop, element.id, cropSession]);
  const cropActive =
    cropSession?.kind === 'element' && cropSession.targetId === element.id;
  const cropRect =
    effectiveCrop && !isFullCrop(effectiveCrop) ? effectiveCrop : null;

  const emitLiveLayout = () => {
    const node = groupRef.current;
    if (!node || !onLiveLayoutChange) return;
    const scaleX = Math.abs(node.scaleX());
    const scaleY = Math.abs(node.scaleY());
    onLiveLayoutChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(isImage ? 40 : 80, display.width * scaleX),
      height: Math.max(isImage ? 24 : boxHeight, boxHeight * scaleY),
      rotation: node.rotation(),
    });
  };

  useLayoutEffect(() => {
    const node = groupRef.current;
    if (!node || live) return;
    node.x(display.x);
    node.y(display.y);
    node.rotation(display.rotation ?? 0);
    node.scaleX(1);
    node.scaleY(1);
    node.getLayer()?.batchDraw();
  }, [display.x, display.y, display.rotation, live]);

  const applySnap = (node: Konva.Group) => {
    if (!canvasPreviewAxis && !canvasAttachSnap) {
      onDragGuideChange(null);
      return;
    }
    const snapped = runDragSnap(
      node,
      elementSize,
      element.id,
      snapSession,
      snapPeers,
      canvasPreviewAxis,
      canvasAttachSnap,
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
      width={display.width}
      height={boxHeight}
      opacity={display.opacity}
      draggable={interactive && !cropActive}
      listening={interactive && !cropActive}
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
        if (canvasPreviewAxis || canvasAttachSnap) {
          onDragGuideChange(
            snapPreviewDrag({
              pos: { x: display.x, y: display.y },
              size: elementSize,
              rotationDeg: display.rotation ?? 0,
              session: snapSession,
              peers: snapPeers,
              excludeId: element.id,
              frameSnap: canvasPreviewAxis,
              attachSnap: false,
            }).guides,
          );
        }
      }}
      onDragMove={(e) => {
        applySnap(e.target as Konva.Group);
        emitLiveLayout();
      }}
      onDragEnd={(e) => {
        const node = e.target as Konva.Group;
        applySnap(node);
        const box = clampNode(node, elementSize, contentRect);
        onDragGuideChange(null);
        const frac = toFractionBox(box, contentRect);
        onChange({ x: frac.x, y: frac.y });
        onLiveLayoutChange?.(null);
        setDragging(false);
      }}
      onTransformStart={() => {
        setTransforming(true);
        onSelect();
        if (canvasPreviewAxis) {
          onDragGuideChange([...snapSession.frameGuides]);
        }
      }}
      onTransform={(e) => {
        emitLiveLayout();
        if (!canvasPreviewAxis) return;
        const node = groupRef.current;
        if (!node) return;
        const snapGuides = applyKonvaResizeSnap({
          node,
          baseWidth: display.width,
          baseHeight: boxHeight,
          session: snapSession,
          uniform: transformUniform,
          skipSnap: isShiftHeld(e.evt),
          frameSnap: canvasPreviewAxis,
        });
        onDragGuideChange(mergeFrameAndSnapGuides(snapSession, snapGuides));
      }}
      onTransformEnd={() => {
        const node = groupRef.current;
        if (!node) return;
        let box = bakeKonvaScaleBox(node, {
          width: isImage ? 40 : 80,
          height: isImage ? 24 : 24,
        });

        if (isText) {
          const scale = box.width / Math.max(1, display.width);
          const nextFontSizePx = Math.max(10, Math.round(fontSizePx * scale));
          box = {
            ...box,
            width: Math.max(60, box.width),
            height: nextFontSizePx * 1.6,
          };
          box = clampBoxToContentRect(box, contentRect, PAD, { width: 60, height: 24 });
          node.x(box.x);
          node.y(box.y);
          onChange({
            ...toFractionBox(box, contentRect),
            fontSize: toFractionFontSize(nextFontSizePx, contentRect),
            rotation: normalizeRotationDegrees(node.rotation()),
          });
        } else if (isImage) {
          box = clampBoxToContentRect(box, contentRect, PAD, { width: 40, height: 24 });
          node.x(box.x);
          node.y(box.y);
          onChange({
            ...toFractionBox(box, contentRect),
            rotation: normalizeRotationDegrees(node.rotation()),
          });
        } else {
          box = clampBoxToContentRect(box, contentRect, PAD, {
            width: isImage ? 40 : 80,
            height: isImage ? 24 : 24,
          });
          node.x(box.x);
          node.y(box.y);
          onChange({
            ...toFractionBox(box, contentRect),
            rotation: normalizeRotationDegrees(node.rotation()),
          });
        }
        onLiveLayoutChange?.(null);
        setTransforming(false);
        onDragGuideChange(null);
      }}
    >
      <Group
        x={element.flipX ? display.width : 0}
        y={element.flipY ? boxHeight : 0}
        scaleX={element.flipX ? -1 : 1}
        scaleY={element.flipY ? -1 : 1}
      >
      {isImage ? (
        <>
          {!hidePixelContent && image ? (
            <Group
              clip={
                cropRect
                  ? {
                      x: cropRect.x * display.width,
                      y: cropRect.y * boxHeight,
                      width: cropRect.width * display.width,
                      height: cropRect.height * boxHeight,
                    }
                  : undefined
              }
            >
              <KonvaImage
                image={image}
                x={cropRect ? (-cropRect.x / cropRect.width) * display.width : 0}
                y={cropRect ? (-cropRect.y / cropRect.height) * display.height : 0}
                width={cropRect ? display.width / cropRect.width : display.width}
                height={cropRect ? display.height / cropRect.height : display.height}
                listening
              />
            </Group>
          ) : (
            <Rect
              width={display.width}
              height={display.height}
              fill={hidePixelContent ? 'rgba(0,0,0,0)' : failed ? 'rgba(232,116,106,0.12)' : 'rgba(255,255,255,0.06)'}
              stroke={hidePixelContent ? (selected ? accent : 'transparent') : failed ? '#e8746a' : 'rgba(255,255,255,0.15)'}
              strokeWidth={hidePixelContent && selected ? 1.5 : 1}
              dash={hidePixelContent ? undefined : failed ? [4, 4] : undefined}
              listening
            />
          )}
          {selected && !interactive && !hidePixelContent && (
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
          {!hidePixelContent && style?.background && (
            <Rect
              width={display.width}
              height={boxHeight}
              fill={style.background}
              cornerRadius={style.backgroundRadius ?? 8}
              listening={false}
            />
          )}
          <Rect
            width={display.width}
            height={boxHeight}
            fill={
              hidePixelContent
                ? 'rgba(0,0,0,0)'
                : isText && !style?.background
                  ? 'rgba(84,214,201,0.06)'
                  : 'rgba(156,140,216,0.06)'
            }
            stroke={selected ? accent : 'transparent'}
            strokeWidth={selected && (hidePixelContent || !style?.background) ? 1.5 : 0}
            cornerRadius={6}
            opacity={hidePixelContent ? 1 : style?.background ? 0 : 1}
            listening
          />
          {!hidePixelContent && (
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
            fill={gradient ? undefined : resolvedFill}
            fillPriority={gradient ? 'linear-gradient' : 'color'}
            fillLinearGradientStartPoint={gradientPoints?.start}
            fillLinearGradientEndPoint={gradientPoints?.end}
            fillLinearGradientColorStops={
              gradient ? [0, gradient.colors[0], 1, gradient.colors[1]] : undefined
            }
            letterSpacing={style?.letterSpacing ?? 0}
            wrap={style?.wrap ?? 'word'}
            stroke={effectProps.stroke ?? style?.stroke}
            strokeWidth={effectProps.strokeWidth ?? style?.strokeWidth ?? 0}
            lineJoin={style?.strokeLineJoin ?? 'miter'}
            shadowEnabled={effectProps.shadowEnabled ?? !!(style?.shadowColor)}
            shadowColor={effectProps.shadowColor ?? style?.shadowColor ?? 'rgba(0,0,0,0.7)'}
            shadowBlur={effectProps.shadowBlur ?? style?.shadowBlur ?? 8}
            shadowOffsetX={effectProps.shadowOffsetX ?? manualShadowOffsetX}
            shadowOffsetY={effectProps.shadowOffsetY ?? manualShadowOffsetY}
            shadowOpacity={effectProps.shadowOpacity ?? style?.shadowOpacity ?? (style?.shadowColor ? 1 : 0.7)}
            lineHeight={style?.lineHeight ?? 1.35}
            textDecoration={style?.underline ? 'underline' : ''}
            listening={false}
          />
          )}
        </>
      )}
      </Group>
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
  snapSession,
  onSelect,
  onChange,
  onDragGuideChange,
  onLiveLayoutChange,
  cropLocked = false,
}: {
  clip: MediaClip;
  contentRect: CanvasRect;
  selected: boolean;
  interactive: boolean;
  snapPeers: SnapPeer[];
  canvasPreviewAxis: boolean;
  canvasAttachSnap: boolean;
  snapSession: SnapSession;
  onSelect: () => void;
  onChange: (patch: Partial<MediaClip>) => void;
  onDragGuideChange: (guides: CanvasGuideLine[] | null) => void;
  onLiveLayoutChange?: (layout: VideoClipLayout | null) => void;
  cropLocked?: boolean;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const layout = resolveVideoClipLayout(clip, contentRect);
  const proxyId = videoProxyId(clip.id);
  const live = selected || dragging || transforming;

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
    const snapped = runDragSnap(
      node,
      { width: layout.width, height: layout.height },
      proxyId,
      snapSession,
      snapPeers,
      canvasPreviewAxis,
      canvasAttachSnap,
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
      width={layout.width}
      height={layout.height}
      opacity={1}
      draggable={interactive && !cropLocked}
      listening={interactive && !cropLocked}
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
          onDragGuideChange([...snapSession.frameGuides]);
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
          rotation: normalizeRotationDegrees(node.rotation()),
        });
        onDragGuideChange(null);
        clearLiveLayout();
        setDragging(false);
      }}
      onTransformStart={() => {
        setTransforming(true);
        onSelect();
        if (canvasPreviewAxis) {
          onDragGuideChange([...snapSession.frameGuides]);
        }
      }}
      onTransform={(e) => {
        const node = groupRef.current;
        if (!node) return;
        emitLiveLayout(node);
        // Video resize: show frame guides only — Konva anchor resize + snap mutation caused minimize bugs.
        if (canvasPreviewAxis) {
          onDragGuideChange([...snapSession.frameGuides]);
        }
      }}
      onTransformEnd={() => {
        const node = groupRef.current;
        if (!node) return;
        let box = bakeKonvaScaleBox(node, { width: 48, height: 48 });
        box = clampBoxToContentRect(box, contentRect, PAD, { width: 48, height: 48 });
        node.x(box.x);
        node.y(box.y);
        // Report px box — parent converts to fractions once via toFractionBox.
        onChange({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          rotation: normalizeRotationDegrees(node.rotation()),
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
        stroke="transparent"
        strokeWidth={0}
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
  compositorOwnsLayerPixels = false,
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
  const cropSession = useAppStore((s) => s.cropSession);
  const setCropSessionRect = useAppStore((s) => s.setCropSessionRect);
  const applyCropSession = useAppStore((s) => s.applyCropSession);
  const cancelCropSession = useAppStore((s) => s.cancelCropSession);
  const focusCanvasElement = (id: string) => studioEdit.focusCanvasElement(id);
  const focusVideoClip = (clipId: string) => studioEdit.focusVideoClip(clipId);
  const previewCtx = usePreviewViewportContext();
  const viewportZoom = previewCtx?.viewport.zoom ?? 1;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragGuides, setDragGuides] = useState<CanvasGuideLine[] | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<CanvasContextTarget | null>(null);
  const [liveToolbarBox, setLiveToolbarBox] = useState<CanvasOrientedBox | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const frameRatio = getDisplayRatio(aspectRatio, videoWidth, videoHeight);
  const contentRect = useMemo(
    () => getVideoContentRect(size, { width: videoWidth, height: videoHeight }, frameRatio),
    [size, videoWidth, videoHeight, frameRatio],
  );
  const snapSession = useMemo(
    () => createSnapSession(contentRect, viewportZoom),
    [contentRect, viewportZoom],
  );
  const lastGuidesRef = useRef<CanvasGuideLine[] | null>(null);
  const setDragGuidesIfChanged = useCallback((guides: CanvasGuideLine[] | null) => {
    if (guidesEqual(lastGuidesRef.current, guides)) return;
    lastGuidesRef.current = guides;
    setDragGuides(guides);
  }, []);

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

  const selectedElement = useMemo(
    () => canvasElements.find((el) => el.id === selectedCanvasElementId) ?? null,
    [canvasElements, selectedCanvasElementId],
  );

  useEffect(() => {
    setLiveToolbarBox(null);
  }, [transformTargetId]);

  const applyCanvasRotation = useCallback(
    (rotation: number) => {
      const layer = layerRef.current;
      if (!layer || !transformTargetId) return;
      const node = layer.findOne(
        (n) => n.id() === transformTargetId || n.name() === transformTargetId,
      ) as Konva.Group | undefined;
      if (!node) return;

      const normalized = normalizeRotationDegrees(rotation);
      node.rotation(normalized);
      node.getLayer()?.batchDraw();

      if (videoSelected && videoClipAtPlayhead) {
        const base = resolveVideoClipLayout(videoClipAtPlayhead, contentRect);
        const live = layoutFromKonvaVideoNode(node, base);
        onVideoLiveLayoutChange?.(live);
        setLiveToolbarBox(live);
        return;
      }

      if (selectedElement) {
        const px = toPxBox(selectedElement, contentRect);
        const height =
          selectedElement.type === 'logo' || selectedElement.type === 'image'
            ? px.height
            : toPxFontSize(selectedElement.fontSize, contentRect) * 1.6;
        setLiveToolbarBox({
          x: node.x(),
          y: node.y(),
          width: px.width,
          height,
          rotation: normalized,
        });
      }
    },
    [
      transformTargetId,
      videoSelected,
      videoClipAtPlayhead,
      contentRect,
      selectedElement,
      onVideoLiveLayoutChange,
    ],
  );

  const commitCanvasRotation = useCallback(() => {
    const layer = layerRef.current;
    if (!layer || !transformTargetId) return;
    const node = layer.findOne(
      (n) => n.id() === transformTargetId || n.name() === transformTargetId,
    ) as Konva.Group | undefined;
    if (!node) return;

    const rotation = normalizeRotationDegrees(node.rotation());
    if (videoSelected && videoClipAtPlayhead) {
      studioEdit.updateVideoTransform(videoClipAtPlayhead.id, { rotation }, { history: true });
      return;
    }
    if (selectedElement) {
      studioEdit.updateCanvasElement(selectedElement.id, { rotation }, { history: true });
    }
  }, [transformTargetId, videoSelected, videoClipAtPlayhead, selectedElement]);

  const orientedToolbarBox = useMemo((): CanvasOrientedBox | null => {
    if (cropSession) return null;
    if (liveToolbarBox) return liveToolbarBox;
    if (videoSelected && videoClipAtPlayhead) {
      return resolveVideoClipLayout(videoClipAtPlayhead, contentRect);
    }
    if (selectedElement) {
      const px = toPxBox(selectedElement, contentRect);
      const height =
        selectedElement.type === 'logo' || selectedElement.type === 'image'
          ? px.height
          : toPxFontSize(selectedElement.fontSize, contentRect) * 1.6;
      return {
        x: px.x,
        y: px.y,
        width: px.width,
        height,
        rotation: selectedElement.rotation ?? 0,
      };
    }
    return null;
  }, [cropSession, liveToolbarBox, videoSelected, videoClipAtPlayhead, contentRect, selectedElement]);

  const cropTargetBox = useMemo((): CanvasOrientedBox | null => {
    if (!cropSession) return null;
    if (cropSession.kind === 'video') {
      const clip = videoClips.find((c) => c.id === cropSession.targetId);
      if (!clip) return null;
      return resolveVideoClipLayout(clip, contentRect);
    }
    const element = canvasElements.find((el) => el.id === cropSession.targetId);
    if (!element || (element.type !== 'logo' && element.type !== 'image')) return null;
    const px = toPxBox(element, contentRect);
    return {
      x: px.x,
      y: px.y,
      width: px.width,
      height: px.height,
      rotation: element.rotation ?? 0,
    };
  }, [cropSession, videoClips, canvasElements, contentRect]);

  useEffect(() => {
    const tr = transformerRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;

    if (previewMode || !transformTargetId || editingElementId || cropSession) {
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
    cropSession,
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

  const canvasElementIds = useMemo(
    () => new Set(canvasElements.map((el) => el.id)),
    [canvasElements],
  );

  const openContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      if (previewMode) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const hit = resolveCanvasContextHit(e.target, stage, canvasElementIds);
      if (hit.kind === 'video') {
        focusVideoClip(hit.clipId);
      } else if (hit.kind === 'element') {
        focusCanvasElement(hit.elementId);
      }

      setContextMenu({
        x: e.evt.clientX,
        y: e.evt.clientY,
        ...hit,
      });
    },
    [previewMode, canvasElementIds, focusVideoClip, focusCanvasElement],
  );

  if (size.width <= 0 || size.height <= 0) return null;

  const editingElement = canvasElements.find((el) => el.id === editingElementId) ?? null;
  const interactive = !previewMode;
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
      ? snapSession.frameGuides
      : null;
  const activeGuides = dragGuides ?? selectionGuides;

  const toStagePoint = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: clientX, y: clientY };
    const rect = stage.container().getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

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
            setDragGuidesIfChanged(null);
            if (canvasTool === 'pan' && interactive) onBackgroundClick?.();
          }
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage()) {
            studioEdit.clearFocus();
            setEditingElementId(null);
          }
        }}
        onContextMenu={openContextMenu}
      >
        <Layer ref={layerRef} listening={interactive}>
          <Rect
            x={contentRect.x}
            y={contentRect.y}
            width={contentRect.width}
            height={contentRect.height}
            stroke={transformTargetId ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.16)'}
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
              snapSession={snapSession}
              onSelect={() => focusVideoClip(videoClipAtPlayhead.id)}
              onChange={(patch) => {
                // VideoClipProxyNode reports on-screen px; store uses fractions of contentRect.
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
              onDragGuideChange={setDragGuidesIfChanged}
              onLiveLayoutChange={(layout) => {
                onVideoLiveLayoutChange?.(layout);
                setLiveToolbarBox(
                  layout
                    ? {
                        x: layout.x,
                        y: layout.y,
                        width: layout.width,
                        height: layout.height,
                        rotation: layout.rotation,
                      }
                    : null,
                );
              }}
              cropLocked={
                cropSession?.kind === 'video' &&
                cropSession.targetId === videoClipAtPlayhead.id
              }
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
              snapSession={snapSession}
              onSelect={() => focusCanvasElement(element.id)}
              onEdit={() => {
                focusCanvasElement(element.id);
                setEditingElementId(element.id);
              }}
              onChange={(patch) => studioEdit.updateCanvasElement(element.id, patch)}
              onDragGuideChange={setDragGuidesIfChanged}
              onLiveLayoutChange={
                selectedCanvasElementId === element.id ? setLiveToolbarBox : undefined
              }
              hidePixelContent={compositorOwnsLayerPixels}
            />
          ))}

          {interactive && transformTargetId && !editingElementId && !cropSession && (
            <StudioCanvasTransformer
              transformerRef={transformerRef}
              keepRatio={transformKeepRatio}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 40 || newBox.height < 24) return oldBox;
                const clamped = clampBoxToContentRect(newBox, contentRect, PAD);
                return { ...newBox, ...clamped };
              }}
            />
          )}
        </Layer>
      </Stage>

      {interactive && !editingElementId && orientedToolbarBox && transformTargetId && !cropSession && (
        <div className="canvas-transform-chrome">
          <CanvasRotationHandle
            box={orientedToolbarBox}
            toStagePoint={toStagePoint}
            onRotate={applyCanvasRotation}
            onRotateEnd={commitCanvasRotation}
          />
          <CanvasSelectionToolbar
            stageSize={size}
            box={orientedToolbarBox}
            videoClip={videoSelected ? videoClipAtPlayhead : null}
            element={selectedElement}
            onEditText={
              selectedElement ? () => setEditingElementId(selectedElement.id) : undefined
            }
          />
        </div>
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

      {interactive && cropSession && cropTargetBox && (
        <div className="canvas-crop-overlay-layer">
          <CanvasCropOverlay
            box={cropTargetBox}
            cropRect={cropSession.rect}
            toStagePoint={toStagePoint}
            onCropRectChange={setCropSessionRect}
            onApply={applyCropSession}
            onCancel={cancelCropSession}
          />
        </div>
      )}

      {interactive && (
        <CanvasContextMenu
          target={contextMenu}
          onClose={() => setContextMenu(null)}
          onEditText={(elementId) => {
            focusCanvasElement(elementId);
            setEditingElementId(elementId);
          }}
        />
      )}
    </>
  );
}
