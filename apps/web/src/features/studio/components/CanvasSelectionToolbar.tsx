import { useMemo, useRef } from 'react';
import {
  Crop,
  Ellipsis,
  FlipHorizontal2,
  FlipVertical2,
  ImageIcon,
  ImagePlus,
  Layers,
  Maximize2,
  Replace,
  Type,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@vokop/ui/shadcn';
import { cn } from '@/lib/cn';
import { useCanvasEditActions } from '@/features/studio/hooks/useCanvasEditActions';
import {
  buildCanvasContextMenuItems,
} from '@/features/studio/lib/canvasContextMenuItems';
import { isImageElement, isTextElement } from '@/features/studio/lib/canvasEditActions';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import type { CanvasElement } from '@/types/canvas';

import {
  orientedBoxTopCenter,
  type CanvasOrientedBox,
} from '@/features/studio/lib/canvasTransformUtils';

export type CanvasToolbarBox = CanvasOrientedBox;

interface CanvasSelectionToolbarProps {
  stageSize: { width: number; height: number };
  box: CanvasToolbarBox;
  videoClip?: MediaClip | null;
  element?: CanvasElement | null;
  onEditText?: () => void;
}

function toolbarPosition(
  box: CanvasToolbarBox,
  stageSize: { width: number; height: number },
  compact: boolean,
) {
  const width = compact ? 120 : 220;
  const anchor = orientedBoxTopCenter(box);
  const left = Math.min(
    Math.max(8, anchor.x - width / 2),
    Math.max(8, stageSize.width - width - 8),
  );
  const top = Math.max(8, anchor.y - 48);
  return { left, top, width };
}

export function CanvasSelectionToolbar({
  stageSize,
  box,
  videoClip,
  element,
  onEditText,
}: CanvasSelectionToolbarProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const actions = useCanvasEditActions();

  const isVideo = Boolean(videoClip);
  const isText = isTextElement(element ?? undefined);
  const isImage = isImageElement(element ?? undefined);

  const pos = toolbarPosition(box, stageSize, isText);

  const overflowItems = useMemo(() => {
    if (isVideo && videoClip) {
      return buildCanvasContextMenuItems({
        target: { kind: 'video', clipId: videoClip.id, x: 0, y: 0 },
        element: undefined,
        actions,
        onReplaceImage: () => replaceInputRef.current?.click(),
        onAddOverlay: () => overlayInputRef.current?.click(),
      });
    }
    if (element) {
      return buildCanvasContextMenuItems({
        target: { kind: 'element', elementId: element.id, x: 0, y: 0 },
        element,
        actions,
        onEditText: onEditText ? () => onEditText() : undefined,
        onReplaceImage: () => replaceInputRef.current?.click(),
        onAddOverlay: () => overlayInputRef.current?.click(),
      });
    }
    return [];
  }, [isVideo, videoClip, element, actions, onEditText]);

  const onReplacePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && element) actions.replaceElementImage(element.id, file);
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

      <div
        className="canvas-selection-toolbar"
        style={{ left: pos.left, top: pos.top, width: pos.width }}
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isText && (
          <button
            type="button"
            className="canvas-selection-toolbar-btn"
            title="Edit text"
            onClick={onEditText}
          >
            <Type size={15} strokeWidth={1.75} />
          </button>
        )}

        {(isVideo || isImage) && (
          <>
            <button
              type="button"
              className="canvas-selection-toolbar-btn"
              title="Replace"
              onClick={() =>
                isVideo ? actions.openMediaPanel() : replaceInputRef.current?.click()
              }
            >
              <Replace size={15} strokeWidth={1.75} />
            </button>

            {isVideo && videoClip && (
              <button
                type="button"
                className="canvas-selection-toolbar-btn"
                title="Fit to frame"
                onClick={() => actions.resetVideoTransform(videoClip.id)}
              >
                <Maximize2 size={15} strokeWidth={1.75} />
              </button>
            )}

            {(isVideo || (element && isImageElement(element))) && (
              <button
                type="button"
                className="canvas-selection-toolbar-btn"
                title="Crop"
                onClick={() =>
                  isVideo && videoClip
                    ? actions.focusVideoForCrop(videoClip.id)
                    : element
                      ? actions.focusElementForCrop(element.id)
                      : undefined
                }
              >
                <Crop size={15} strokeWidth={1.75} />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                className="canvas-selection-toolbar-btn"
                title="Flip"
              >
                <FlipHorizontal2 size={15} strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="studio-context-menu min-w-[10rem]">
                <DropdownMenuItem
                  onClick={() =>
                    isVideo && videoClip
                      ? actions.toggleVideoFlip(videoClip.id, 'x')
                      : element
                        ? actions.toggleElementFlip(element.id, 'x')
                        : undefined
                  }
                >
                  <FlipHorizontal2 size={14} />
                  Flip horizontal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    isVideo && videoClip
                      ? actions.toggleVideoFlip(videoClip.id, 'y')
                      : element
                        ? actions.toggleElementFlip(element.id, 'y')
                        : undefined
                  }
                >
                  <FlipVertical2 size={14} />
                  Flip vertical
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="canvas-selection-toolbar-btn"
                title="Overlay"
              >
                <Layers size={15} strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="studio-context-menu min-w-[10rem]">
                <DropdownMenuItem onClick={actions.addImageTrackAtPlayhead}>
                  <ImageIcon size={14} />
                  Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={actions.addStickerTrackAtPlayhead}>
                  <Layers size={14} />
                  Sticker
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => overlayInputRef.current?.click()}>
                  <ImagePlus size={14} />
                  Add overlay
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn('canvas-selection-toolbar-btn', 'canvas-selection-toolbar-btn--more')}
            title="More"
          >
            <Ellipsis size={15} strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="studio-context-menu min-w-[12rem]">
            {overflowItems.map((item) => {
              const Icon = item.icon;
              if (item.submenu?.length) {
                return (
                  <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger disabled={item.disabled}>
                      <Icon size={14} />
                      {item.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="studio-context-menu">
                      {item.submenu.map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <DropdownMenuItem key={sub.id} onClick={sub.onClick} disabled={sub.disabled}>
                            <SubIcon size={14} />
                            {sub.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              }
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  variant={item.destructive ? 'destructive' : 'default'}
                >
                  <Icon size={14} />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
