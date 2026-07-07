import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearFontAtlasCache,
  getCachedFontAtlas,
  loadFontAtlas,
} from '@/features/studio/fonts/fontAtlas';
import type { FontAtlas } from '@/features/studio/fonts/types';
import { SYSTEM_FONT_FAMILIES } from '@/features/studio/fonts/systemFonts';

type Status = 'idle' | 'loading' | 'error';

export function useFontAtlas({ open }: { open: boolean }) {
  const [atlas, setAtlas] = useState<FontAtlas | null>(() => getCachedFontAtlas());
  const [status, setStatus] = useState<Status>(() => (getCachedFontAtlas() ? 'idle' : 'loading'));

  useEffect(() => {
    if (!open || atlas) return;

    setStatus('loading');
    void loadFontAtlas().then((data) => {
      if (data) {
        setAtlas(data);
        setStatus('idle');
      } else {
        setStatus('error');
      }
    });
  }, [open, atlas]);

  const retry = useCallback(() => {
    clearFontAtlasCache();
    setStatus('loading');
    void loadFontAtlas().then((data) => {
      if (data) {
        setAtlas(data);
        setStatus('idle');
      } else {
        setStatus('error');
      }
    });
  }, []);

  const googleFontNames = useMemo(() => {
    if (!atlas) return [];
    return Object.keys(atlas.fonts).sort((a, b) => a.localeCompare(b));
  }, [atlas]);

  const systemFontNames = useMemo(
    () =>
      [...SYSTEM_FONT_FAMILIES]
        .filter((name) => !name.includes('-'))
        .sort((a, b) => a.localeCompare(b)),
    [],
  );

  return { atlas, status, googleFontNames, systemFontNames, retry };
}
