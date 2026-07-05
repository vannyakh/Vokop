import { Upload, X } from 'lucide-react';
import { getStudioTemplate } from '@vokop/shared';
import { useAppStore } from '@/features/project';

export function TemplateSlotBanner() {
  const activeStudioTemplateId = useAppStore((s) => s.activeStudioTemplateId);
  const pendingTemplateSlotIds = useAppStore((s) => s.pendingTemplateSlotIds);
  const clearStudioTemplate = useAppStore((s) => s.clearStudioTemplate);
  const setVideo = useAppStore((s) => s.setVideo);

  if (!activeStudioTemplateId || pendingTemplateSlotIds.length === 0) return null;

  const template = getStudioTemplate(activeStudioTemplateId);
  if (!template) return null;

  const pendingSlots = template.slots.filter((slot) => pendingTemplateSlotIds.includes(slot.id));
  if (pendingSlots.length === 0) return null;

  const needsVideo = pendingSlots.some((slot) => slot.kind === 'video');

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setVideo(file, URL.createObjectURL(file));
    };
    input.click();
  };

  return (
    <div className="studio-template-slot-banner" role="status">
      <div className="studio-template-slot-banner-copy">
        <strong>Template: {template.name}</strong>
        <span>
          {pendingSlots.map((slot) => slot.label).join(' · ')} — add media to complete the layout.
        </span>
      </div>
      <div className="studio-template-slot-banner-actions">
        {needsVideo && (
          <button type="button" className="studio-template-slot-btn" onClick={handleUpload}>
            <Upload size={14} />
            Upload video
          </button>
        )}
        <button
          type="button"
          className="studio-template-slot-btn studio-template-slot-btn--ghost"
          onClick={clearStudioTemplate}
          title="Dismiss template reminders"
        >
          <X size={14} />
          Dismiss
        </button>
      </div>
    </div>
  );
}
