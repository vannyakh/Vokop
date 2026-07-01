import type { Segment } from '@/types';

export function parseSegments(text: string): Segment[] {
  const lines = text.split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    const match = line.match(/\[(\d{2}):(\d{2})\]\s+([^:]+):\s+(.*)/);
    if (match) {
      return {
        time: parseInt(match[1]) * 60 + parseInt(match[2]),
        speaker: match[3],
        text: match[4],
        raw: line,
      };
    }
    return { time: 0, speaker: '', text: line, raw: line };
  });
}

export function extractSpeakers(text: string): string[] {
  const speakerRegex = /\[\d{2}:\d{2}\]\s+([^:]+):/g;
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
    .map((s) => `[${formatSegmentTime(s.time)}] ${s.speaker}: ${s.text}`)
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
