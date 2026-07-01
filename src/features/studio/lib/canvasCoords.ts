/** Map pointer position to canvas-local coordinates (handles CSS scale transforms). */
export function clientToCanvas(
  wrap: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = wrap.getBoundingClientRect();
  const logicalW = wrap.offsetWidth || rect.width;
  const logicalH = wrap.offsetHeight || rect.height;
  return {
    x: ((clientX - rect.left) / rect.width) * logicalW,
    y: ((clientY - rect.top) / rect.height) * logicalH,
  };
}

export function clampCanvasPoint(
  x: number,
  y: number,
  size: { width: number; height: number },
  stage: { width: number; height: number },
  pad = 24,
) {
  return {
    x: Math.min(Math.max(pad, x), Math.max(pad, stage.width - size.width - pad)),
    y: Math.min(Math.max(pad, y), Math.max(pad, stage.height - size.height - pad)),
  };
}
