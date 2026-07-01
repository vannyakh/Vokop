import { useRef } from 'react';
import { useAppStore } from '@/features/project';
import { Label } from '@/components/ui/Label';
import { Slider } from '@/components/ui/Slider';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import { Type, RotateCcw, Trash2, ImageIcon, Stamp } from 'lucide-react';
import type { CanvasElement } from '@/types/canvas';

function elementTitle(element: CanvasElement) {
  if (element.type === 'text') return 'Text layer';
  if (element.type === 'overlay') return 'Overlay layer';
  if (element.type === 'logo') return 'Logo';
  return 'Image overlay';
}

export function CanvasElementPanel() {
  const selectedId = useAppStore((s) => s.selectedCanvasElementId);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const removeCanvasElement = useAppStore((s) => s.removeCanvasElement);

  const element = canvasElements.find((el) => el.id === selectedId);
  const isImage = element?.type === 'logo' || element?.type === 'image';

  if (!element) {
    return (
      <StudioPanel title="Canvas selection" icon={<Type size={12} className="text-accent" />}>
        <p className="text-xs text-muted leading-relaxed">
          Select a text, logo, or overlay on the preview canvas to edit position and size. Use Select
          in the header to drag and transform elements.
        </p>
      </StudioPanel>
    );
  }

  const resetLayout = () => {
    if (isImage) {
      updateCanvasElement(element.id, {
        rotation: 0,
        opacity: element.type === 'logo' ? 1 : 0.85,
        width: element.type === 'logo' ? 120 : 200,
        height: element.type === 'logo' ? 48 : 120,
      });
      return;
    }
    updateCanvasElement(element.id, {
      rotation: 0,
      fontSize: element.type === 'text' ? 22 : 18,
    });
  };

  const panelIcon =
    element.type === 'logo' ? (
      <Stamp size={12} className="text-accent" />
    ) : element.type === 'image' ? (
      <ImageIcon size={12} className="text-accent" />
    ) : (
      <Type size={12} className="text-accent" />
    );

  return (
    <div className="space-y-3">
      <StudioPanel title={elementTitle(element)} icon={panelIcon}>
        <div className="space-y-3">
          {isImage && element.src && (
            <div className="studio-canvas-image-preview">
              <img src={element.src} alt={element.text} />
            </div>
          )}

          {!isImage && (
            <div className="space-y-1.5">
              <Label>Content</Label>
              <textarea
                value={element.text}
                onChange={(e) => updateCanvasElement(element.id, { text: e.target.value })}
                rows={3}
                className="studio-canvas-textarea"
              />
            </div>
          )}

          {!isImage && (
            <Slider
              label="Font size"
              valueLabel={`${element.fontSize}px`}
              min={12}
              max={48}
              step={1}
              value={element.fontSize}
              onChange={(e) =>
                updateCanvasElement(element.id, { fontSize: parseInt(e.target.value, 10) })
              }
            />
          )}

          {isImage && (
            <Slider
              label="Opacity"
              valueLabel={`${Math.round(element.opacity * 100)}%`}
              min={0.1}
              max={1}
              step={0.05}
              value={element.opacity}
              onChange={(e) =>
                updateCanvasElement(element.id, { opacity: parseFloat(e.target.value) })
              }
            />
          )}

          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted">
            <div className="studio-canvas-meta-chip">
              <span className="text-faint">X</span> {Math.round(element.x)}
            </div>
            <div className="studio-canvas-meta-chip">
              <span className="text-faint">Y</span> {Math.round(element.y)}
            </div>
            <div className="studio-canvas-meta-chip">
              <span className="text-faint">W</span> {Math.round(element.width)}
            </div>
            <div className="studio-canvas-meta-chip">
              <span className="text-faint">{isImage ? 'H' : '°'}</span>{' '}
              {isImage ? Math.round(element.height) : Math.round(element.rotation)}
            </div>
          </div>

          <button type="button" onClick={resetLayout} className="studio-tools-action-btn">
            <RotateCcw size={14} />
            Reset transform
          </button>
          {isImage && (
            <button
              type="button"
              onClick={() => removeCanvasElement(element.id)}
              className="studio-tools-action-btn w-full text-[#e8746a]"
            >
              <Trash2 size={14} />
              Remove from frame
            </button>
          )}
          <button
            type="button"
            onClick={() => selectCanvasElement(null)}
            className="studio-tools-action-btn w-full"
          >
            Deselect
          </button>
        </div>
      </StudioPanel>
    </div>
  );
}

export function CanvasFrameAssetsPanel() {
  const addCanvasLogo = useAppStore((s) => s.addCanvasLogo);
  const addCanvasImageOverlay = useAppStore((s) => s.addCanvasImageOverlay);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const onLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addCanvasLogo(file);
    e.target.value = '';
  };

  const onOverlayPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addCanvasImageOverlay(file);
    e.target.value = '';
  };

  return (
    <StudioPanel title="Frame assets" icon={<ImageIcon size={12} className="text-accent" />}>
      <p className="text-xs text-muted leading-relaxed mb-3">
        Add a brand logo or image overlay on top of the video frame. Drag and resize on the canvas.
      </p>
      <div className="space-y-2">
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={onLogoPick}
        />
        <input
          ref={overlayInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={onOverlayPick}
        />
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          className="studio-tools-action-btn w-full"
        >
          <Stamp size={14} />
          Add logo
        </button>
        <button
          type="button"
          onClick={() => overlayInputRef.current?.click()}
          className="studio-tools-action-btn w-full"
        >
          <ImageIcon size={14} />
          Add image overlay
        </button>
      </div>
    </StudioPanel>
  );
}
