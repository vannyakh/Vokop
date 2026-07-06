import {
  AlignCenter,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Crop,
  Film,
  FlipHorizontal2,
  FlipVertical2,
  Hand,
  ImageIcon,
  ImagePlus,
  Layers,
  Magnet,
  MousePointer2,
  Replace,
  Scissors,
  Trash2,
  Type,
} from 'lucide-react';
import type { EditorMenuItem } from '@/features/studio/components/EditorContextMenu';
import {
  contextMenuTitle,
  isImageElement,
  isTextElement,
  isVisualElement,
} from '@/features/studio/lib/canvasEditActions';
import type { CanvasEditActions } from '@/features/studio/hooks/useCanvasEditActions';
import type { CanvasElement } from '@/types/canvas';
import type { CanvasContextTarget } from '@/features/studio/components/CanvasContextMenu';
import {
  buildFootageContextMenuItems,
  type FootageContextMenuActions,
} from '@/features/studio/lib/timelineFootageContextMenuItems';

interface MenuBuildOptions {
  target: CanvasContextTarget;
  element: CanvasElement | undefined;
  actions: CanvasEditActions;
  footageActions?: FootageContextMenuActions;
  onEditText?: (elementId: string) => void;
  onReplaceImage?: () => void;
  onAddOverlay?: () => void;
}

function clipboardBlock(
  actions: CanvasEditActions,
  options: {
    showPaste?: boolean;
    includeDelete?: boolean;
    deleteDestructive?: boolean;
    deleteLabel?: string;
    separatorBefore?: boolean;
  },
): EditorMenuItem[] {
  const items: EditorMenuItem[] = [
    {
      id: 'copy',
      label: 'Copy',
      icon: Copy,
      shortcutKey: 'shortcutCopy',
      onClick: actions.copySelection,
      separatorBefore: options.separatorBefore,
    },
    {
      id: 'cut',
      label: 'Cut',
      icon: Scissors,
      shortcutKey: 'shortcutCut',
      onClick: actions.cutSelection,
    },
  ];

  if (options.showPaste !== false) {
    items.push({
      id: 'paste',
      label: 'Paste',
      icon: ClipboardPaste,
      shortcutKey: 'shortcutPaste',
      onClick: actions.pasteAtPlayhead,
      disabled: !actions.hasClipboard,
    });
  }

  items.push({
    id: 'duplicate',
    label: 'Duplicate',
    icon: CopyPlus,
    shortcutKey: 'shortcutDuplicate',
    onClick: actions.duplicateSelection,
  });

  if (options.includeDelete !== false) {
    items.push({
      id: 'delete',
      label: options.deleteLabel ?? 'Delete',
      icon: Trash2,
      shortcutKey: 'shortcutDelete',
      onClick: actions.deleteSelection,
      destructive: options.deleteDestructive,
    });
  }

  return items;
}

function transformBlock(
  target: CanvasContextTarget,
  element: CanvasElement | undefined,
  actions: CanvasEditActions,
  options: { onReplaceImage?: () => void; onAddOverlay?: () => void; separatorBefore?: boolean },
): EditorMenuItem[] {
  const items: EditorMenuItem[] = [];

  if (target.kind === 'element' && isImageElement(element) && options.onReplaceImage) {
    items.push({
      id: 'replace',
      label: 'Replace',
      icon: Replace,
      onClick: options.onReplaceImage,
      separatorBefore: options.separatorBefore ?? true,
    });
  }

  if (target.kind === 'video') {
    items.push({
      id: 'replace',
      label: 'Replace',
      icon: Replace,
      onClick: actions.openMediaPanel,
      separatorBefore: options.separatorBefore ?? true,
    });
  }

  const flipSubmenu: EditorMenuItem[] =
    target.kind === 'video'
      ? [
          {
            id: 'flip-h',
            label: 'Flip horizontal',
            icon: FlipHorizontal2,
            onClick: () => actions.toggleVideoFlip(target.clipId, 'x'),
          },
          {
            id: 'flip-v',
            label: 'Flip vertical',
            icon: FlipVertical2,
            onClick: () => actions.toggleVideoFlip(target.clipId, 'y'),
          },
        ]
      : target.kind === 'element'
        ? [
            {
              id: 'flip-h',
              label: 'Flip horizontal',
              icon: FlipHorizontal2,
              onClick: () => actions.toggleElementFlip(target.elementId, 'x'),
            },
            {
              id: 'flip-v',
              label: 'Flip vertical',
              icon: FlipVertical2,
              onClick: () => actions.toggleElementFlip(target.elementId, 'y'),
            },
          ]
        : [];

  const cropSeparator = items.length > 0;
  items.push(
    {
      id: 'crop',
      label: 'Crop',
      icon: Crop,
      onClick: () =>
        target.kind === 'video'
          ? actions.focusVideoForCrop(target.clipId)
          : target.kind === 'element'
            ? actions.focusElementForCrop(target.elementId)
            : undefined,
      separatorBefore: cropSeparator || (options.separatorBefore ?? false),
    },
    {
      id: 'flip',
      label: 'Flip',
      icon: FlipHorizontal2,
      onClick: () => {},
      submenu: flipSubmenu,
    },
    {
      id: 'overlay',
      label: 'Overlay',
      icon: Layers,
      onClick: () => {},
      submenu: [
        {
          id: 'overlay-image',
          label: 'Image',
          icon: ImageIcon,
          onClick: actions.addImageTrackAtPlayhead,
        },
        {
          id: 'overlay-sticker',
          label: 'Sticker',
          icon: Layers,
          onClick: actions.addStickerTrackAtPlayhead,
        },
      ],
    },
    {
      id: 'add-overlay',
      label: 'Add overlay',
      icon: ImagePlus,
      onClick: () => options.onAddOverlay?.(),
    },
  );

  return items;
}

export function buildCanvasContextMenuItems({
  target,
  element,
  actions,
  footageActions,
  onEditText,
  onReplaceImage,
  onAddOverlay,
}: MenuBuildOptions): EditorMenuItem[] {
  if (target.kind === 'video' && footageActions) {
    return buildFootageContextMenuItems(footageActions);
  }

  if (target.kind === 'video') {
    const items: EditorMenuItem[] = [
      ...clipboardBlock(actions, { showPaste: false, includeDelete: false }),
      {
        id: 'select-footage',
        label: 'Select on timeline',
        icon: Film,
        onClick: () => actions.selectVideoOnTimeline(target.clipId),
        separatorBefore: true,
      },
      {
        id: 'open-media',
        label: 'Open media panel',
        icon: ImageIcon,
        onClick: actions.openMediaPanel,
      },
    ];

    if (actions.canSplit) {
      items.push({
        id: 'split',
        label: 'Split at playhead',
        icon: Scissors,
        shortcutKey: 'shortcutSplit',
        onClick: actions.splitAtPlayhead,
        separatorBefore: true,
      });
    }

    if (actions.canDelete) {
      items.push({
        id: 'delete-clip',
        label: 'Delete clip',
        icon: Trash2,
        onClick: actions.deleteSelection,
        destructive: true,
        separatorBefore: true,
      });
    }

    return items;
  }

  if (target.kind === 'element') {
    const items: EditorMenuItem[] = [];

    if (isTextElement(element)) {
      items.push({
        id: 'edit-text',
        label: 'Edit text',
        icon: Type,
        onClick: () => onEditText?.(target.elementId),
      });
    }

    items.push(
      ...clipboardBlock(actions, {
        separatorBefore: isTextElement(element),
        deleteLabel: isTextElement(element) ? 'Delete' : 'Delete layer',
        deleteDestructive: false,
      }),
    );

    if (isImageElement(element)) {
      items.push(
        ...transformBlock(target, element, actions, {
          onReplaceImage,
          onAddOverlay,
          separatorBefore: true,
        }),
      );
    }

    return items;
  }

  const items: EditorMenuItem[] = [];

  if (actions.hasClipboard) {
    items.push({
      id: 'paste',
      label: 'Paste',
      icon: ClipboardPaste,
      shortcutKey: 'shortcutPaste',
      onClick: actions.pasteAtPlayhead,
    });
  }

  items.push(
    {
      id: 'add-text',
      label: 'Add caption',
      icon: Type,
      onClick: actions.addCaptionAtPlayhead,
      separatorBefore: true,
    },
    {
      id: 'add-image',
      label: 'Add image',
      icon: ImageIcon,
      onClick: actions.addImageTrackAtPlayhead,
    },
    {
      id: 'axis',
      label: actions.canvasPreviewAxis ? 'Hide frame guides' : 'Show frame guides',
      icon: AlignCenter,
      shortcutKey: 'shortcutPreviewAxis',
      onClick: actions.toggleCanvasPreviewAxis,
      separatorBefore: true,
    },
    {
      id: 'snap',
      label: actions.canvasAttachSnap ? 'Disable attach snap' : 'Enable attach snap',
      icon: Magnet,
      shortcutKey: 'shortcutAttachSnap',
      onClick: actions.toggleCanvasAttachSnap,
    },
    {
      id: 'select-tool',
      label: 'Select tool',
      icon: MousePointer2,
      shortcutKey: 'shortcutSelectTool',
      onClick: () => actions.setCanvasTool('select'),
      separatorBefore: true,
    },
    {
      id: 'pan-tool',
      label: 'Pan tool',
      icon: Hand,
      shortcutKey: 'shortcutPanTool',
      onClick: () => actions.setCanvasTool('pan'),
    },
  );

  return items;
}

export { contextMenuTitle, isTextElement, isImageElement, isVisualElement };
