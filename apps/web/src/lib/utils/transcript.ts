import type { Segment } from '@/types';

export function parseSegments(text: string): Segment[] {
  const lines = text.split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    // `[MM:SS] Speaker: text` or ranged `[MM:SS-MM:SS] Speaker: text`.
    const match = line.match(/\[(\d{2}):(\d{2})(?:-(\d{2}):(\d{2}))?\]\s+([^:]+):\s+(.*)/);
    if (match) {
      const time = parseInt(match[1]) * 60 + parseInt(match[2]);
      const endTime = match[3] ? parseInt(match[3]) * 60 + parseInt(match[4]) : undefined;
      return {
        time,
        ...(endTime != null && endTime > time ? { endTime } : {}),
        speaker: match[5],
        text: match[6],
        raw: line,
      };
    }
    return { time: 0, speaker: '', text: line, raw: line };
  });
}

export function extractSpeakers(text: string): string[] {
  const speakerRegex = /\[\d{2}:\d{2}(?:-\d{2}:\d{2})?\]\s+([^:]+):/g;
  const speakers = new Set<string>();
  let match;
  while ((match = speakerRegex.exec(text)) !== null) {
    speakers.add(match[1].trim());
  }
  return Array.from(speakers);
}

export function formatSegmentTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function rebuildTranscript(segments: Segment[]): string {
  return segments
    .map((s) => {
      const range =
        s.endTime != null && s.endTime > s.time
          ? `[${formatSegmentTime(s.time)}-${formatSegmentTime(s.endTime)}]`
          : `[${formatSegmentTime(s.time)}]`;
      return `${range} ${s.speaker}: ${s.text}`;
    })
    .join('\n');
}

export function updateSegmentText(
  segments: Segment[],
  index: number,
  newText: string,
): string {
  const updated = [...segments];
  updated[index] = { ...updated[index], text: newText };
  return rebuildTranscript(updated);
}

export function updateSegmentTime(
  segments: Segment[],
  index: number,
  newTime: number,
  maxTime = Infinity,
): string {
  const updated = [...segments];
  const current = updated[index];
  const clamped = Math.min(Math.max(0, newTime), maxTime);
  const delta = clamped - current.time;
  updated[index] = {
    ...current,
    time: clamped,
    ...(current.endTime != null
      ? { endTime: Math.min(maxTime, current.endTime + delta) }
      : {}),
  };
  updated.sort((a, b) => a.time - b.time);
  return rebuildTranscript(updated);
}

export function updateSegmentDuration(
  segments: Segment[],
  index: number,
  newDuration: number,
  totalDuration: number,
  minDuration = 0.4,
): string {
  const updated = [...segments];
  const start = updated[index].time;
  const end = Math.min(totalDuration, start + Math.max(minDuration, newDuration));

  if (updated[index].endTime != null) {
    updated[index] = { ...updated[index], endTime: Math.max(end, start + minDuration) };
    return rebuildTranscript(updated);
  }

  if (index < segments.length - 1) {
    updated[index + 1] = { ...updated[index + 1], time: Math.max(end, start + minDuration) };
  }

  return rebuildTranscript(updated);
}

export function removeSegment(segments: Segment[], index: number): string {
  if (index < 0 || index >= segments.length) return rebuildTranscript(segments);
  const updated = segments.filter((_, i) => i !== index);
  return rebuildTranscript(updated);
}

export function addSegmentAtTime(
  segments: Segment[],
  time: number,
  speaker = 'Speaker',
  text = 'New caption',
): string {
  const updated = [...segments, { time, speaker, text, raw: '' }];
  updated.sort((a, b) => a.time - b.time);
  return rebuildTranscript(
    updated.map((s) => ({
      ...s,
      raw: s.raw || `[${formatSegmentTime(s.time)}] ${s.speaker}: ${s.text}`,
    })),
  );
}

/** Split the segment under `time` into two clips at the playhead. */
export function splitSegmentAtTime(
  segments: Segment[],
  time: number,
  totalDuration: number,
  minGap = 0.4,
): string | null {
  for (let i = 0; i < segments.length; i++) {
    const start = segments[i].time;
    const end = i < segments.length - 1 ? segments[i + 1].time : totalDuration;
    if (time > start + minGap && time < end - minGap) {
      const inserted: Segment = {
        time,
        speaker: segments[i].speaker,
        text: '…',
        raw: '',
      };
      const updated = [...segments.slice(0, i + 1), inserted, ...segments.slice(i + 1)];
      return rebuildTranscript(
        updated.map((s) => ({
          ...s,
          raw: s.raw || `[${formatSegmentTime(s.time)}] ${s.speaker}: ${s.text}`,
        })),
      );
    }
  }
  return null;
}

export function getSegmentIndexAtTime(
  segments: Segment[],
  time: number,
  totalDuration: number,
): number {
  for (let i = 0; i < segments.length; i++) {
    const start = segments[i].time;
    const end = i < segments.length - 1 ? segments[i + 1].time : totalDuration;
    if (time >= start && time < end) return i;
  }
  return -1;
}

export function getActiveSegmentIndex(segments: Segment[], currentTime: number): number {
  let index = -1;
  for (let i = 0; i < segments.length; i++) {
    if (currentTime >= segments[i].time) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}
