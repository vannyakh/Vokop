import { useCallback, useEffect, useState } from 'react';
import {
  isLocalFontAccessSupported,
  requestSystemFonts,
  type SystemFontMetadata,
} from '@/features/studio/lib/localFonts';

export type SystemFontStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'unsupported';

export function useSystemFonts() {
  const [status, setStatus] = useState<SystemFontStatus>(
    isLocalFontAccessSupported() ? 'idle' : 'unsupported',
  );
  const [fonts, setFonts] = useState<SystemFontMetadata[]>([]);
  const [message, setMessage] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!isLocalFontAccessSupported()) {
      setStatus('unsupported');
      return;
    }
    setStatus('loading');
    const result = await requestSystemFonts();
    if (result.deniedMessage && result.fonts.length === 0) {
      setStatus('denied');
      setMessage(result.deniedMessage);
      setFonts([]);
      return;
    }
    setFonts(result.fonts);
    setMessage(undefined);
    setStatus('ready');
  }, []);

  useEffect(() => {
    if (!isLocalFontAccessSupported()) return;
    const onChange = () => void load();
    void navigator.permissions
      .query({ name: 'local-fonts' as PermissionName })
      .then((perm) => perm.addEventListener('change', onChange))
      .catch(() => undefined);
    return () => {
      void navigator.permissions
        .query({ name: 'local-fonts' as PermissionName })
        .then((perm) => perm.removeEventListener('change', onChange))
        .catch(() => undefined);
    };
  }, [load]);

  return { status, fonts, message, load, supported: isLocalFontAccessSupported() };
}
