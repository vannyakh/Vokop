import { useMemo, useRef } from 'react';
import { cn } from '@/lib/cn';
import { EditorContextMenu } from '@/features/studio/components/EditorContextMenu';
import { useCanvasEditActions } from '@/features/studio/hooks/useCanvasEditActions';
import { useFootageContextMenuActions } from '@/features/studio/hooks/useFootageContextMenuActions';
import {
  buildCanvasContextMenuItems,
  contextMenuTitle,
} from '@/features/studio/lib/canvasContextMenuItems';
import { useAppStore } from '@/features/project';

export type CanvasContextTarget =
  | ({ x: number; y: number } & { kind: 'video'; clipId: string })
  | ({ x: number; y: number } & { kind: 'element'; elementId: string })
  | ({ x: number; y: number } & { kind: 'background' });

interface CanvasContextMenuProps {
  target: CanvasContextTarget | null;
  onClose: () => void;
  onEditText?: (elementId: string) => void;
}

export function CanvasContextMenu({ target, onClose, onEditText }: CanvasContextMenuProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const actions = useCanvasEditActions();
  const footageActions = useFootageContextMenuActions(
    target?.kind === 'video' ? target.clipId : null,
  );

  const element =
    target?.kind === 'element'
      ? canvasElements.find((el) => el.id === target.elementId)
      : undefined;

  const title =
    target?.kind === 'video' ? '' : contextMenuTitle(target?.kind ?? 'background', element);

  const items = useMemo(() => {
    if (!target) return [];
    return buildCanvasContextMenuItems({
      target,
      element,
      actions,
      footageActions: target.kind === 'video' ? footageActions : undefined,
      onEditText,
      onReplaceImage: () => replaceInputRef.current?.click(),
      onAddOverlay: () => overlayInputRef.current?.click(),
    });
  }, [target, element, actions, footageActions, onEditText]);

  const onReplacePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && target?.kind === 'element') {
      actions.replaceElementImage(target.elementId, file);
    }
    e.target.value = '';
  };

  const onOverlayPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) actions.addOverlayFromFile(file);
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={onReplacePick}
      />
      <input
        ref={overlayInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={onOverlayPick}
      />
      <EditorContextMenu
        target={target}
        title={title}
        items={items}
        onClose={onClose}
        className={cn(
          'studio-canvas-context-menu',
          target?.kind === 'video' && 'studio-footage-context-menu',
        )}
      />
    </>
  );
}
