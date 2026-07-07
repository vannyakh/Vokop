import type { FontAtlasEntry } from '@/features/studio/fonts/types';

const ROW_HEIGHT = 32;
const PREVIEW_SCALE = 0.72;

export function FontSpritePreview({ entry }: { entry: FontAtlasEntry }) {
  return (
    <div
      className="canvas-font-sprite"
      style={{
        width: entry.w,
        height: ROW_HEIGHT,
        WebkitMaskImage: `url(/fonts/font-chunk-${entry.ch}.avif)`,
        WebkitMaskPosition: `-${entry.x}px -${entry.y}px`,
        WebkitMaskRepeat: 'no-repeat',
        maskImage: `url(/fonts/font-chunk-${entry.ch}.avif)`,
        maskPosition: `-${entry.x}px -${entry.y}px`,
        maskRepeat: 'no-repeat',
        transform: `scale(${PREVIEW_SCALE})`,
        transformOrigin: 'left center',
      }}
    />
  );
}
