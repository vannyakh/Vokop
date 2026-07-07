/*
 * CSS background → canvas renderer (adapted from OpenCut `src/gradients/canvas.ts`).
 * Paints multi-layer CSS backgrounds (linear/radial gradients + solid colors)
 * onto a 2D canvas context with accurate angles, stop offsets, and extents.
 */

import type {
  GradientAst,
  GradientColor,
  GradientColorStop,
  GradientDistance,
  GradientOrientation,
  GradientPosition,
  RadialOrientation,
} from './parser.js';
import { parseGradient } from './parser.js';

type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type BackgroundLayer =
  | { type: 'color'; value: string }
  | { type: 'gradient'; value: GradientAst };

type LinearPoints = { x0: number; y0: number; x1: number; y1: number; length: number };

type RadialDimensions = { cx: number; cy: number; rx: number; ry: number };

type PositionKeyword = 'left' | 'center' | 'right' | 'top' | 'bottom';

const gradientLayerPattern =
  /^(?:-(webkit|o|ms|moz)-)?(linear-gradient|repeating-linear-gradient|radial-gradient|repeating-radial-gradient)/i;

/** Paint a CSS background value (gradient layers and/or solid colors) covering `width`×`height` at the context origin. */
export function drawCssBackground(
  ctx: Canvas2DContext,
  width: number,
  height: number,
  css: string,
): void {
  const layers = parseBackgroundLayers(css);
  const layersInPaintOrder = layers.slice().reverse();

  for (const layer of layersInPaintOrder) {
    if (layer.type === 'color') {
      ctx.fillStyle = layer.value;
      ctx.fillRect(0, 0, width, height);
      continue;
    }
    drawGradientLayer(ctx, width, height, layer.value);
  }
}

/** Paint a CSS background into an arbitrary rect (translated `drawCssBackground`). */
export function drawCssBackgroundInRect(
  ctx: Canvas2DContext,
  rect: { x: number; y: number; width: number; height: number },
  css: string,
): void {
  ctx.save();
  ctx.translate(rect.x, rect.y);
  ctx.beginPath();
  ctx.rect(0, 0, rect.width, rect.height);
  ctx.clip();
  drawCssBackground(ctx, rect.width, rect.height, css);
  ctx.restore();
}

const parseBackgroundLayers = (css: string): Array<BackgroundLayer> => {
  const segments = splitCssLayers(css);
  const layers: Array<BackgroundLayer> = [];

  for (const segment of segments) {
    if (!segment) continue;

    if (gradientLayerPattern.test(segment)) {
      try {
        const parsed = parseGradient(segment.trim());
        for (const gradient of parsed) {
          layers.push({ type: 'gradient', value: gradient });
        }
        continue;
      } catch {
        layers.push({ type: 'color', value: segment });
        continue;
      }
    }

    layers.push({ type: 'color', value: segment });
  }

  return layers;
};

const splitCssLayers = (css: string): Array<string> => {
  const layers: Array<string> = [];
  let current = '';
  let depth = 0;

  for (const char of css) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      layers.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) layers.push(current.trim());

  return layers;
};

const drawGradientLayer = (
  ctx: Canvas2DContext,
  width: number,
  height: number,
  gradient: GradientAst,
): void => {
  if (gradient.type.includes('linear')) {
    drawLinearGradient(ctx, width, height, gradient);
    return;
  }
  drawRadialGradient(ctx, width, height, gradient);
};

const drawLinearGradient = (
  ctx: Canvas2DContext,
  width: number,
  height: number,
  gradient: GradientAst,
): void => {
  const { x0, y0, x1, y1, length } = resolveLinearPoints(width, height, gradient.orientation);
  const canvasGradient = ctx.createLinearGradient(x0, y0, x1, y1);
  const colorStops = normalizeColorStops(gradient.colorStops, length);

  for (const stop of colorStops) {
    canvasGradient.addColorStop(stop.offset, stop.color);
  }

  ctx.fillStyle = canvasGradient;
  ctx.fillRect(0, 0, width, height);
};

const drawRadialGradient = (
  ctx: Canvas2DContext,
  width: number,
  height: number,
  gradient: GradientAst,
): void => {
  const { cx, cy, rx, ry } = resolveRadialDimensions(width, height, gradient.orientation);
  const gradientLength = Math.max(rx, ry);
  const colorStops = normalizeColorStops(gradient.colorStops, gradientLength);

  if (rx === ry || ry === 0) {
    const canvasGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    for (const stop of colorStops) {
      canvasGradient.addColorStop(stop.offset, stop.color);
    }
    ctx.fillStyle = canvasGradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const scaleY = ry / rx;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, scaleY);
  const canvasGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  for (const stop of colorStops) {
    canvasGradient.addColorStop(stop.offset, stop.color);
  }
  ctx.fillStyle = canvasGradient;
  ctx.fillRect(-cx, -cy / scaleY, width, height / scaleY);
  ctx.restore();
};

const resolveLinearPoints = (
  width: number,
  height: number,
  orientation: GradientOrientation | undefined,
): LinearPoints => {
  const angle = resolveLinearAngle(orientation);
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const centerX = width / 2;
  const centerY = height / 2;
  const halfLength = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const x0 = centerX - dx * halfLength;
  const y0 = centerY - dy * halfLength;
  const x1 = centerX + dx * halfLength;
  const y1 = centerY + dy * halfLength;
  const length = Math.hypot(x1 - x0, y1 - y0);

  return { x0, y0, x1, y1, length };
};

const resolveLinearAngle = (orientation: GradientOrientation | undefined): number => {
  if (!orientation) return 180;

  if (!Array.isArray(orientation)) {
    if (orientation.type === 'angular') {
      return Number.parseFloat(orientation.value);
    }
    if (orientation.type === 'directional') {
      return angleFromDirectional(orientation.value);
    }
  }

  return 180;
};

const angleFromDirectional = (value: string): number => {
  const normalized = value.toLowerCase().replace('to', '').trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  let dx = 0;
  let dy = 0;

  for (const part of parts) {
    if (part === 'left') dx = -1;
    if (part === 'right') dx = 1;
    if (part === 'top') dy = -1;
    if (part === 'bottom') dy = 1;
  }

  if (dx === 0 && dy === 0) return 180;

  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (angle + 360) % 360;
};

const resolveRadialDimensions = (
  width: number,
  height: number,
  orientation: GradientOrientation | undefined,
): RadialDimensions => {
  const centerFallback = { cx: width / 2, cy: height / 2 };
  const radial = Array.isArray(orientation)
    ? (orientation[0] as RadialOrientation | undefined)
    : undefined;

  if (!radial) {
    const { rx, ry } = resolveRadialExtents({
      width,
      height,
      cx: centerFallback.cx,
      cy: centerFallback.cy,
      shape: 'ellipse',
      extent: 'farthest-corner',
    });
    return { ...centerFallback, rx, ry };
  }

  if (radial.type === 'shape') {
    const { cx, cy } = resolveRadialCenter(width, height, radial.at);
    const shape = radial.value;

    if (radial.style && radial.style.type === 'position') {
      const xDist = radial.style.value.x;
      const yDist = radial.style.value.y;
      const rx = xDist ? resolveEllipseDimension(xDist, width) : width / 2;
      const ry = yDist ? resolveEllipseDimension(yDist, height) : height / 2;
      return { cx, cy, rx, ry };
    }

    if (radial.style && radial.style.type !== 'extent-keyword') {
      const resolvedRadius = resolveDistanceInPixels(radial.style, Math.max(width, height));
      const radius = resolvedRadius ?? 0;
      if (shape === 'circle') {
        return { cx, cy, rx: radius, ry: radius };
      }
      return { cx, cy, rx: radius, ry: radius };
    }

    const extent =
      radial.style && radial.style.type === 'extent-keyword'
        ? radial.style.value
        : 'farthest-corner';
    const { rx, ry } = resolveRadialExtents({ width, height, cx, cy, shape, extent });
    return { cx, cy, rx, ry };
  }

  if (radial.type === 'extent-keyword') {
    const { cx, cy } = resolveRadialCenter(width, height, radial.at);
    const { rx, ry } = resolveRadialExtents({
      width,
      height,
      cx,
      cy,
      shape: 'ellipse',
      extent: radial.value,
    });
    return { cx, cy, rx, ry };
  }

  const { cx, cy } = resolveRadialCenter(width, height, radial.at);
  const { rx, ry } = resolveRadialExtents({
    width,
    height,
    cx,
    cy,
    shape: 'ellipse',
    extent: 'farthest-corner',
  });
  return { cx, cy, rx, ry };
};

const resolveRadialCenter = (
  width: number,
  height: number,
  position?: GradientPosition,
): { cx: number; cy: number } => {
  if (!position) {
    return { cx: width / 2, cy: height / 2 };
  }

  const normalized = normalizePositionKeywords(position);
  const cx = resolvePositionValue(normalized.value.x, width, 'x');
  const cy = resolvePositionValue(normalized.value.y, height, 'y');

  return { cx, cy };
};

const normalizePositionKeywords = (position: GradientPosition): GradientPosition => {
  const xValue = position.value.x;
  const yValue = position.value.y;

  if (xValue?.type === 'position-keyword' && yValue?.type === 'position-keyword') {
    const xKeyword = xValue.value.toLowerCase() as PositionKeyword;
    const yKeyword = yValue.value.toLowerCase() as PositionKeyword;
    const xIsVertical = xKeyword === 'top' || xKeyword === 'bottom';
    const yIsHorizontal = yKeyword === 'left' || yKeyword === 'right';

    if (xIsVertical && yIsHorizontal) {
      return {
        type: 'position',
        value: {
          x: { type: 'position-keyword', value: yKeyword },
          y: { type: 'position-keyword', value: xKeyword },
        },
      };
    }
  }

  return position;
};

const resolveRadialExtents = ({
  width,
  height,
  cx,
  cy,
  shape,
  extent,
}: {
  width: number;
  height: number;
  cx: number;
  cy: number;
  shape: 'circle' | 'ellipse';
  extent: string;
}): { rx: number; ry: number } => {
  const left = cx;
  const right = width - cx;
  const top = cy;
  const bottom = height - cy;

  if (shape === 'circle') {
    const distances = [
      Math.hypot(left, top),
      Math.hypot(right, top),
      Math.hypot(left, bottom),
      Math.hypot(right, bottom),
    ];
    if (extent === 'closest-side') {
      return { rx: Math.min(left, right, top, bottom), ry: 0 };
    }
    if (extent === 'farthest-side') {
      return { rx: Math.max(left, right, top, bottom), ry: 0 };
    }
    if (extent === 'closest-corner') {
      return { rx: Math.min(...distances), ry: 0 };
    }
    return { rx: Math.max(...distances), ry: 0 };
  }

  if (extent === 'closest-side') {
    return { rx: Math.min(left, right), ry: Math.min(top, bottom) };
  }
  if (extent === 'farthest-side') {
    return { rx: Math.max(left, right), ry: Math.max(top, bottom) };
  }

  const corners = [
    { dx: left, dy: top },
    { dx: right, dy: top },
    { dx: left, dy: bottom },
    { dx: right, dy: bottom },
  ];
  const sorted = corners
    .slice()
    .sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
  const chosen = extent === 'closest-corner' ? sorted[0] : sorted[sorted.length - 1];
  return { rx: Math.abs(chosen.dx), ry: Math.abs(chosen.dy) };
};

const resolvePositionValue = (
  distance: GradientDistance | undefined,
  axisSize: number,
  axis: 'x' | 'y',
): number => {
  if (!distance) return axisSize / 2;

  if (distance.type === '%') {
    return (Number.parseFloat(distance.value) / 100) * axisSize;
  }
  if (distance.type === 'position-keyword') {
    return keywordToPosition(distance.value, axisSize, axis);
  }
  if (distance.type === 'px') {
    return Number.parseFloat(distance.value);
  }
  if (distance.type === 'em') {
    return Number.parseFloat(distance.value) * 16;
  }

  return axisSize / 2;
};

const resolveDistanceInPixels = (
  distance: GradientDistance,
  axisSize: number,
): number | null => {
  if (distance.type === '%') {
    return (Number.parseFloat(distance.value) / 100) * axisSize;
  }
  if (distance.type === 'px') {
    return Number.parseFloat(distance.value);
  }
  if (distance.type === 'em') {
    return Number.parseFloat(distance.value) * 16;
  }
  return null;
};

const resolveEllipseDimension = (distance: GradientDistance, axisSize: number): number => {
  const resolved = resolveDistanceInPixels(distance, axisSize);
  return resolved ?? axisSize / 2;
};

const keywordToPosition = (value: string, axisSize: number, axis: 'x' | 'y'): number => {
  const keyword = value.toLowerCase() as PositionKeyword;

  if (keyword === 'center') return axisSize / 2;

  if (axis === 'x') {
    if (keyword === 'left') return 0;
    if (keyword === 'right') return axisSize;
  }
  if (axis === 'y') {
    if (keyword === 'top') return 0;
    if (keyword === 'bottom') return axisSize;
  }

  return axisSize / 2;
};

const isTransparent = (color: string): boolean => {
  const lower = color.toLowerCase().trim();
  if (lower === 'transparent') return true;
  const rgbaMatch = lower.match(
    /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/,
  );
  return Boolean(rgbaMatch && Number.parseFloat(rgbaMatch[1]) === 0);
};

const parseColorToRgb = (
  color: string,
): { r: number; g: number; b: number; a: number } | null => {
  const lower = color.toLowerCase().trim();

  const hexMatch = lower.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: Number.parseInt(hex[0] + hex[0], 16),
        g: Number.parseInt(hex[1] + hex[1], 16),
        b: Number.parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
        a: Number.parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  const rgbMatch = lower.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
  if (rgbMatch) {
    return {
      r: Number.parseFloat(rgbMatch[1]),
      g: Number.parseFloat(rgbMatch[2]),
      b: Number.parseFloat(rgbMatch[3]),
      a: 1,
    };
  }

  const rgbaMatch = lower.match(
    /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/,
  );
  if (rgbaMatch) {
    return {
      r: Number.parseFloat(rgbaMatch[1]),
      g: Number.parseFloat(rgbaMatch[2]),
      b: Number.parseFloat(rgbaMatch[3]),
      a: Number.parseFloat(rgbaMatch[4]),
    };
  }

  return null;
};

/** Replace `transparent` stops with a zero-alpha version of the nearest opaque stop so canvas doesn't fade through gray. */
const fixTransparentStops = (
  stops: Array<{ color: string; offset: number | null }>,
): Array<{ color: string; offset: number | null }> => {
  if (stops.length === 0) return stops;

  const result = stops.map((stop) => ({ ...stop }));

  for (let i = 0; i < result.length; i++) {
    if (!isTransparent(result[i].color)) continue;

    let donorColor: { r: number; g: number; b: number } | null = null;

    for (let j = i - 1; j >= 0; j--) {
      if (!isTransparent(result[j].color)) {
        const parsed = parseColorToRgb(result[j].color);
        if (parsed) {
          donorColor = parsed;
          break;
        }
      }
    }

    if (!donorColor) {
      for (let j = i + 1; j < result.length; j++) {
        if (!isTransparent(result[j].color)) {
          const parsed = parseColorToRgb(result[j].color);
          if (parsed) {
            donorColor = parsed;
            break;
          }
        }
      }
    }

    if (donorColor) {
      result[i].color = `rgba(${donorColor.r},${donorColor.g},${donorColor.b},0)`;
    }
  }

  return result;
};

const normalizeColorStops = (
  colorStops: Array<GradientColorStop>,
  gradientLength: number,
): Array<{ color: string; offset: number }> => {
  const mappedStops = colorStops.map((stop) => ({
    color: colorToString(stop),
    offset: resolveStopOffset(stop, gradientLength),
  }));

  const resolvedStops = fixTransparentStops(mappedStops).map((stop) => ({ ...stop }));
  const knownIndices = resolvedStops
    .map((stop, index) => (stop.offset === null ? null : index))
    .filter((index): index is number => index !== null);

  if (knownIndices.length === 0) {
    const step = resolvedStops.length > 1 ? 1 / (resolvedStops.length - 1) : 1;
    for (let index = 0; index < resolvedStops.length; index += 1) {
      resolvedStops[index].offset = step * index;
    }
    return clampStops(resolvedStops);
  }

  const firstKnown = knownIndices[0];
  if (resolvedStops[firstKnown].offset === null) {
    resolvedStops[firstKnown].offset = 0;
  }

  for (let index = 0; index < firstKnown; index += 1) {
    const nextOffset = resolvedStops[firstKnown].offset ?? 0;
    resolvedStops[index].offset = (nextOffset * index) / firstKnown;
  }

  for (let i = 0; i < knownIndices.length - 1; i += 1) {
    const startIndex = knownIndices[i];
    const endIndex = knownIndices[i + 1];
    const startOffset = resolvedStops[startIndex].offset ?? 0;
    const endOffset = resolvedStops[endIndex].offset ?? startOffset;
    const gap = endIndex - startIndex;

    if (gap <= 1) continue;

    const step = (endOffset - startOffset) / gap;
    for (let index = 1; index < gap; index += 1) {
      resolvedStops[startIndex + index].offset = startOffset + step * index;
    }
  }

  const lastKnown = knownIndices[knownIndices.length - 1];
  const lastOffset = resolvedStops[lastKnown].offset ?? 1;
  if (lastKnown < resolvedStops.length - 1) {
    const gap = resolvedStops.length - 1 - lastKnown;
    const step = (1 - lastOffset) / gap;
    for (let index = 1; index <= gap; index += 1) {
      resolvedStops[lastKnown + index].offset = lastOffset + step * index;
    }
  }

  return clampStops(resolvedStops);
};

const clampStops = (
  stops: Array<{ color: string; offset: number | null }>,
): Array<{ color: string; offset: number }> =>
  stops.map((stop) => ({
    color: stop.color,
    offset: Math.min(1, Math.max(0, stop.offset ?? 0)),
  }));

const resolveStopOffset = (
  stop: GradientColorStop,
  gradientLength: number,
): number | null => {
  if (!stop.length) return null;

  if (stop.length.type === '%') {
    return Number.parseFloat(stop.length.value) / 100;
  }
  if (stop.length.type === 'px') {
    return Number.parseFloat(stop.length.value) / gradientLength;
  }
  if (stop.length.type === 'em') {
    return (Number.parseFloat(stop.length.value) * 16) / gradientLength;
  }

  return null;
};

const colorToString = (color: GradientColor): string => {
  if (color.type === 'hex') return `#${color.value}`;
  if (color.type === 'literal') return color.value;
  if (color.type === 'rgb') return `rgb(${color.value.join(',')})`;
  if (color.type === 'rgba') return `rgba(${color.value.join(',')})`;
  if (color.type === 'hsl') return `hsl(${color.value.join(',')})`;
  if (color.type === 'hsla') return `hsla(${color.value.join(',')})`;
  return `var(${color.value})`;
};
