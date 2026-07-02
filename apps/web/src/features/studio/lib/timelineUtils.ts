export function formatStudioTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}

export function timeToPx(time: number, pxPerSec: number): number {
  return time * pxPerSec;
}

export function pxToTime(px: number, pxPerSec: number): number {
  return Math.max(0, px / pxPerSec);
}

export function getRulerTicks(duration: number, pxPerSec: number): number[] {
  if (!duration) return [0];
  let interval = 1;
  if (pxPerSec < 40) interval = 5;
  else if (pxPerSec < 70) interval = 2;

  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += interval) ticks.push(t);
  if (ticks[ticks.length - 1] !== duration) ticks.push(duration);
  return ticks;
}
