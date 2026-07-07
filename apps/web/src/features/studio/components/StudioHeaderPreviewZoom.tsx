import { usePreviewViewportContext } from '@/features/studio/context/PreviewViewportContext';
import { PreviewZoomSelect } from '@/features/studio/components/PreviewToolbar';

/** Fit / preview zoom control for the header toolbar. */
export function StudioHeaderPreviewZoom() {
  const previewCtx = usePreviewViewportContext();
  if (!previewCtx) return null;

  return (
    <div className="studio-header-preview-zoom" role="toolbar" aria-label="Preview zoom">
      <PreviewZoomSelect
        viewport={previewCtx.viewport}
        className="studio-header-preview-zoom-trigger"
      />
    </div>
  );
}
