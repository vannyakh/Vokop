import type { TextVerticalAlign } from '@/features/studio/constants/textTemplates';

const PAD = 24;
const BOTTOM_INSET = 48;

export function estimateCanvasSize(videoWidth: number, videoHeight: number) {
  if (videoWidth > 0 && videoHeight > 0) {
    const displayW = 400;
    return {
      width: displayW,
      height: (videoHeight / videoWidth) * displayW,
    };
  }
  return { width: 360, height: 640 };
}

export function computeTemplatePlacement(
  verticalAlign: TextVerticalAlign,
  fontSize: number,
  canvasSize: { width: number; height: number },
) {
  const width = Math.min(280, canvasSize.width - PAD * 2);
  const height = fontSize * 1.6;
  let y = PAD;

  if (verticalAlign === 'center') {
    y = Math.max(PAD, (canvasSize.height - height) / 2);
  } else if (verticalAlign === 'bottom') {
    y = Math.max(PAD, canvasSize.height - BOTTOM_INSET - height);
  }

  return { x: PAD, y, width, height };
}
