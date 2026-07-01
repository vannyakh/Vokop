import type { CaptionStyle } from '@/features/studio/lib/exportSettings';

export interface TimedCaption {
  startSec: number;
  endSec: number;
  speaker: string;
  text: string;
}

/** Parse `[MM:SS] Speaker: text` transcript format into timed captions */
export function parseTranscriptCaptions(translatedText: string): TimedCaption[] {
  const lines = translatedText.split('\n').filter(Boolean);
  const captions: TimedCaption[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\[(\d{2}):(\d{2})\]\s+([^:]+):\s+(.*)/);
    if (!match) continue;

    const startSec = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const nextMatch = lines[i + 1]?.match(/\[(\d{2}):(\d{2})\]/);
    const endSec = nextMatch
      ? parseInt(nextMatch[1], 10) * 60 + parseInt(nextMatch[2], 10)
      : startSec + 4;

    captions.push({
      startSec,
      endSec,
      speaker: match[3].trim(),
      text: match[4].trim(),
    });
  }

  return captions;
}

export function getActiveCaptions(captions: TimedCaption[], currentSec: number): TimedCaption[] {
  return captions.filter((c) => currentSec >= c.startSec && currentSec < c.endSec);
}

/** Render captions onto a 2D canvas context */
export function renderCaptionsOnCanvas(
  ctx: CanvasRenderingContext2D,
  captions: TimedCaption[],
  currentSec: number,
  canvasWidth: number,
  canvasHeight: number,
  style: CaptionStyle,
  scale: number,
) {
  if (style === 'none') return;

  const active = getActiveCaptions(captions, currentSec);
  if (active.length === 0) return;

  const baseFontSize = Math.floor(canvasHeight * 0.052 * scale);
  const lineH = baseFontSize * 1.4;
  const marginBottom = canvasHeight * 0.06;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  active.slice(-2).forEach((cap, idx, arr) => {
    const displayText = cap.text;
    const y = canvasHeight - marginBottom - (arr.length - 1 - idx) * lineH;

    ctx.font = `bold ${baseFontSize}px "Khmer OS Battambang", "Noto Sans", "Inter", sans-serif`;
    const textWidth = ctx.measureText(displayText).width;
    const padX = baseFontSize * 0.5;
    const padY = baseFontSize * 0.22;
    const bgX = canvasWidth / 2 - textWidth / 2 - padX;
    const bgW = textWidth + padX * 2;
    const bgH = baseFontSize + padY * 2;

    if (style === 'highlight' || style === 'karaoke') {
      // Background pill
      ctx.fillStyle = style === 'karaoke' ? 'rgba(0,0,0,0.72)' : 'rgba(20,20,20,0.78)';
      roundRect(ctx, bgX, y - baseFontSize - padY, bgW, bgH, 6);

      if (style === 'karaoke') {
        // Karaoke sweep overlay
        const progress = Math.min(1, (currentSec - cap.startSec) / Math.max(0.1, cap.endSec - cap.startSec));
        ctx.fillStyle = 'rgba(84,214,201,0.28)';
        roundRect(ctx, bgX, y - baseFontSize - padY, bgW * progress, bgH, 6);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${baseFontSize}px "Khmer OS Battambang", "Noto Sans", "Inter", sans-serif`;
      ctx.fillText(displayText, canvasWidth / 2, y);
    } else {
      // Standard: white text + dark outline
      ctx.font = `bold ${baseFontSize}px "Khmer OS Battambang", "Noto Sans", "Inter", sans-serif`;
      ctx.strokeStyle = 'rgba(0,0,0,0.95)';
      ctx.lineWidth = Math.max(3, baseFontSize * 0.1);
      ctx.lineJoin = 'round';
      ctx.strokeText(displayText, canvasWidth / 2, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(displayText, canvasWidth / 2, y);
    }
  });

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
