export function createBackingCanvas({
  width,
  height,
}: {
  width: number;
  height: number;
}): OffscreenCanvas {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas is not supported in this environment');
  }
  return new OffscreenCanvas(width, height);
}

export function ensureOffscreenCanvas({
  source,
  width,
  height,
  label,
}: {
  source: CanvasImageSource;
  width: number;
  height: number;
  label: string;
}): OffscreenCanvas {
  if (source instanceof OffscreenCanvas) {
    return source;
  }

  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error(`OffscreenCanvas is required for ${label}`);
  }

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(`Failed to get 2d context for ${label}`);
  }
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}
