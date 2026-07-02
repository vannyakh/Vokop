export const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', ratio: null, hint: 'Native video size' },
  { id: '16:9', label: '16:9', ratio: 16 / 9, hint: 'YouTube, widescreen' },
  { id: '4:3', label: '4:3', ratio: 4 / 3, hint: 'Classic, presentations' },
  { id: '2:1', label: '2:1', ratio: 2 / 1, hint: 'Cinematic banner' },
  { id: '9:16', label: '9:16', ratio: 9 / 16, hint: 'TikTok, Reels, Shorts' },
  { id: '1:1', label: '1:1', ratio: 1 / 1, hint: 'Instagram posts' },
  { id: '3:4', label: '3:4', ratio: 3 / 4, hint: 'Portrait feed' },
] as const;

export type AspectRatioId = (typeof ASPECT_RATIOS)[number]['id'];

export function getAspectRatioOption(id: AspectRatioId) {
  return ASPECT_RATIOS.find((r) => r.id === id) ?? ASPECT_RATIOS[0];
}

const PRESET_RATIOS: { id: Exclude<AspectRatioId, 'original'>; ratio: number }[] = [
  { id: '16:9', ratio: 16 / 9 },
  { id: '9:16', ratio: 9 / 16 },
  { id: '1:1', ratio: 1 },
  { id: '4:3', ratio: 4 / 3 },
  { id: '3:4', ratio: 3 / 4 },
  { id: '2:1', ratio: 2 / 1 },
];

export function detectAspectRatioId(width: number, height: number): AspectRatioId {
  if (width <= 0 || height <= 0) return 'original';
  const native = width / height;
  let best: AspectRatioId = 'original';
  let bestDiff = Infinity;
  for (const preset of PRESET_RATIOS) {
    const diff = Math.abs(native - preset.ratio) / preset.ratio;
    if (diff < bestDiff) {
      bestDiff = diff;
      best = preset.id;
    }
  }
  return bestDiff <= 0.06 ? best : 'original';
}

export function getDisplayRatio(
  id: AspectRatioId,
  videoWidth: number,
  videoHeight: number,
): number | null {
  const option = getAspectRatioOption(id);
  if (option.ratio != null) return option.ratio;
  if (videoWidth > 0 && videoHeight > 0) return videoWidth / videoHeight;
  return null;
}

export function isPortraitRatio(ratio: number) {
  return ratio < 1;
}

export function defaultProjectName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '').trim();
  return base || 'Untitled project';
}
