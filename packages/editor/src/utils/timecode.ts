/**
 * Timecode utilities — adapted from Omniclip's time-ruler utils.
 * All time values are in milliseconds unless the function name says otherwise.
 */

function padTo2Digits(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Convert milliseconds → "H:MM:SS" string.
 * Example: 3_661_000 ms → "1:01:01"
 */
export function convertMsToHms(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}:${padTo2Digits(m)}:${padTo2Digits(s)}`;
  return `${padTo2Digits(m)}:${padTo2Digits(s)}`;
}

/**
 * Convert milliseconds → "H:MM:SS.mmm" string (sub-second precision).
 * Example: 1_234 ms → "00:00:01.234"
 */
export function convertMsToHmsMsMs(ms: number): string {
  const totalMs = Math.floor(ms);
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1_000);
  const msRemainder = totalMs % 1_000;
  return `${padTo2Digits(h)}:${padTo2Digits(m)}:${padTo2Digits(s)}.${msRemainder.toString().padStart(3, '0')}`;
}

/**
 * Convert seconds → "HH:MM:SS" label (for timecode display in timeline ruler).
 * Safe for zero and negative values.
 */
export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  if (h > 0) return `${h}:${padTo2Digits(m)}:${padTo2Digits(s)}`;
  return `${padTo2Digits(m)}:${padTo2Digits(s)}`;
}

/**
 * Format a tick in seconds as a short label for the timeline ruler.
 * Hides minutes when duration < 1 minute.
 */
export function formatRulerTick(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return formatTimecode(seconds);
}
