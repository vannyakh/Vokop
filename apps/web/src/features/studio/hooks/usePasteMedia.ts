import { useEffect } from 'react';
import { useAppStore } from '@/features/project';
import { kindFromFile } from '@/features/studio/lib/mediaLibrary';

function isTypableTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (el as HTMLElement).isContentEditable
  );
}

function extractMediaFiles(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData?.items) return [];
  const files: File[] = [];
  for (const item of clipboardData.items) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file && kindFromFile(file)) files.push(file);
  }
  return files;
}

/**
 * Paste media files from the OS clipboard (OpenCut-style): imports them into
 * the media library and drops each new asset on the timeline at the playhead.
 * Internal clip paste (⌘V on a copied timeline clip) stays in the keydown
 * shortcut handler — this hook only reacts when actual files are pasted.
 */
export function usePasteMedia() {
  useEffect(() => {
    const onPaste = async (event: ClipboardEvent) => {
      if (isTypableTarget(document.activeElement)) return;

      const files = extractMediaFiles(event.clipboardData);
      if (files.length === 0) {
        // No media on the OS clipboard — paste the internal timeline clip instead.
        event.preventDefault();
        useAppStore.getState().pasteTimelineClipboard();
        return;
      }

      event.preventDefault();

      const store = useAppStore.getState();
      const knownIds = new Set(store.mediaAssets.map((asset) => asset.id));
      const atTime = store.currentTime;

      await store.importMediaFiles(files);

      const next = useAppStore.getState();
      const newAssets = next.mediaAssets.filter((asset) => !knownIds.has(asset.id));
      for (const asset of newAssets) {
        next.addMediaAssetToTimeline(asset.id, atTime);
      }
    };

    const handler = (event: ClipboardEvent) => {
      void onPaste(event);
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, []);
}
