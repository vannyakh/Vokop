import type { SubtitlesRequest, SubtitlesResponse, TranscriptSegment } from '@vokop/api';

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function formatSrtTime(sec: number): string {
  const totalMs = Math.max(0, Math.round(sec * 1000));
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
}

function formatVttTime(sec: number): string {
  return formatSrtTime(sec).replace(',', '.');
}

function toSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, i) => {
      const speaker = seg.speakerId ? `${seg.speakerId}: ` : '';
      return `${i + 1}\n${formatSrtTime(seg.startSec)} --> ${formatSrtTime(seg.endSec)}\n${speaker}${seg.text}\n`;
    })
    .join('\n');
}

function toVtt(segments: TranscriptSegment[]): string {
  const body = segments
    .map((seg) => {
      const speaker = seg.speakerId ? `<v ${seg.speakerId}>` : '';
      return `${formatVttTime(seg.startSec)} --> ${formatVttTime(seg.endSec)}\n${speaker}${seg.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

export function buildSubtitles(input: SubtitlesRequest): SubtitlesResponse {
  const format = input.format ?? 'srt';
  const content = format === 'vtt' ? toVtt(input.segments) : toSrt(input.segments);
  return {
    format,
    content,
    segments: input.segments,
  };
}
