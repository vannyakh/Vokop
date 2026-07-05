import type { StudioHeaderModalId } from '@/features/studio/components/StudioHeaderModals';

const EVENT = 'vokop:studio-modal';

export function openStudioChromeModal(id: StudioHeaderModalId): void {
  window.dispatchEvent(new CustomEvent<{ id: StudioHeaderModalId }>(EVENT, { detail: { id } }));
}

export function subscribeStudioChromeModal(
  handler: (id: StudioHeaderModalId) => void,
): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ id: StudioHeaderModalId }>).detail;
    if (detail?.id) handler(detail.id);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
