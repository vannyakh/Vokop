import type { CSSProperties } from 'react';

export const STUDIO_MODAL_STYLES = {
  container: { background: '#0a0a0a', backgroundColor: '#0a0a0a' },
  header: { display: 'none', margin: 0, padding: 0, height: 0, overflow: 'hidden' },
  body: { background: '#0a0a0a', backgroundColor: '#0a0a0a' },
  footer: { display: 'none', margin: 0, padding: 0 },
} as const satisfies Record<string, CSSProperties>;
