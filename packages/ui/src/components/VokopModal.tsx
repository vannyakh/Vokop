import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Modal, type ModalProps } from '../antd/index.js';
import { cn } from '../lib/cn.js';

type ModalClassNamesObject = {
  root?: string;
  header?: string;
  body?: string;
  footer?: string;
  container?: string;
  title?: string;
  wrapper?: string;
  mask?: string;
  close?: string;
};

type ModalStylesObject = {
  root?: CSSProperties;
  header?: CSSProperties;
  body?: CSSProperties;
  footer?: CSSProperties;
  container?: CSSProperties;
  title?: CSSProperties;
  wrapper?: CSSProperties;
  mask?: CSSProperties;
  close?: CSSProperties;
};

type DragOffset = { x: number; y: number };

type DragSession = DragOffset & {
  pointerId: number | null;
  startX: number;
  startY: number;
};

const INITIAL_DRAG_SESSION: DragSession = {
  pointerId: null,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
};

const DRAG_HANDLE_BLOCK_SELECTOR =
  '.vokop-modal-close, .ant-modal-close, button, a, input, select, textarea, label';

const BASE_MODAL_CLASS_NAMES: ModalClassNamesObject = {
  root: 'vokop-modal-root',
  container: 'vokop-modal-container',
  wrapper: 'vokop-modal-wrapper',
  header: 'vokop-modal-header',
  body: 'vokop-modal-body',
  footer: 'vokop-modal-footer',
  mask: 'vokop-modal-mask',
  close: 'vokop-modal-close',
  title: 'vokop-modal-title',
};

const BASE_MODAL_STYLES: ModalStylesObject = {
  container: { padding: 0 },
  body: { padding: 0 },
  header: { marginBottom: 0 },
  footer: { marginTop: 0, padding: 0 },
};

function isModalClassNamesObject(value: ModalProps['classNames']): value is ModalClassNamesObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isModalStylesObject(value: ModalProps['styles']): value is ModalStylesObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeModalClassNames(user?: ModalProps['classNames']): ModalProps['classNames'] {
  if (!isModalClassNamesObject(user)) return BASE_MODAL_CLASS_NAMES;
  return {
    root: cn(BASE_MODAL_CLASS_NAMES.root, user.root),
    container: cn(BASE_MODAL_CLASS_NAMES.container, user.container),
    wrapper: cn(BASE_MODAL_CLASS_NAMES.wrapper, user.wrapper),
    header: cn(BASE_MODAL_CLASS_NAMES.header, user.header),
    body: cn(BASE_MODAL_CLASS_NAMES.body, user.body),
    footer: cn(BASE_MODAL_CLASS_NAMES.footer, user.footer),
    mask: cn(BASE_MODAL_CLASS_NAMES.mask, user.mask),
    close: cn(BASE_MODAL_CLASS_NAMES.close, user.close),
    title: cn(BASE_MODAL_CLASS_NAMES.title, user.title),
  };
}

function mergeModalStyles(user?: ModalProps['styles']): ModalProps['styles'] {
  if (!isModalStylesObject(user)) return BASE_MODAL_STYLES;
  return {
    ...BASE_MODAL_STYLES,
    ...user,
    container: { ...BASE_MODAL_STYLES.container, ...user.container },
    body: { ...BASE_MODAL_STYLES.body, ...user.body },
    header: { ...BASE_MODAL_STYLES.header, ...user.header },
    footer: { ...BASE_MODAL_STYLES.footer, ...user.footer },
  };
}

function isDragHandleTarget(target: EventTarget | null, root: HTMLElement): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest(DRAG_HANDLE_BLOCK_SELECTOR)) return false;

  const header = root.querySelector(
    '.vokop-modal-header, .ant-modal-header, .vokop-modal-drag-handle',
  );
  return Boolean(header?.contains(target));
}

function useModalDrag(enabled: boolean, open?: boolean) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession>(INITIAL_DRAG_SESSION);
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const resetPosition = useCallback(() => {
    dragRef.current = INITIAL_DRAG_SESSION;
    setDragging(false);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) resetPosition();
  }, [open, resetPosition]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return;

      const root = surfaceRef.current;
      if (!root || !isDragHandleTarget(event.target, root)) return;

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: offset.x,
        y: offset.y,
      };
      setDragging(true);
      root.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [enabled, offset.x, offset.y],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || dragRef.current.pointerId !== event.pointerId) return;

      setOffset({
        x: dragRef.current.x + event.clientX - dragRef.current.startX,
        y: dragRef.current.y + event.clientY - dragRef.current.startY,
      });
    },
    [enabled],
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || dragRef.current.pointerId !== event.pointerId) return;

      dragRef.current.pointerId = null;
      setDragging(false);

      if (surfaceRef.current?.hasPointerCapture(event.pointerId)) {
        surfaceRef.current.releasePointerCapture(event.pointerId);
      }
    },
    [enabled],
  );

  return {
    surfaceRef,
    offset,
    dragging,
    handlePointerDown,
    handlePointerMove,
    endDrag,
  };
}

export interface VokopModalProps extends Omit<ModalProps, 'classNames' | 'styles'> {
  children: ReactNode;
  subtitle?: ReactNode;
  /** Drag the modal by its header. Resets position when closed. */
  draggable?: boolean;
  classNames?: ModalProps['classNames'];
  styles?: ModalProps['styles'];
}

export function VokopModalTitle({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="vokop-modal-title-wrap">
      <div className="vokop-modal-title-text">{title}</div>
      {subtitle ? <div className="vokop-modal-subtitle">{subtitle}</div> : null}
    </div>
  );
}

function mergeModalMask(mask?: ModalProps['mask']): ModalProps['mask'] {
  if (mask === false) return false;
  const userMask = typeof mask === 'object' && mask !== null ? mask : {};
  return { blur: false, ...userMask };
}

export function VokopModal({
  className,
  children,
  title,
  subtitle,
  width = 420,
  centered = true,
  destroyOnHidden = true,
  footer = null,
  draggable = false,
  classNames,
  styles,
  modalRender: userModalRender,
  mask,
  open,
  closeIcon = <X size={16} strokeWidth={2} aria-hidden="true" />,
  ...props
}: VokopModalProps) {
  const {
    surfaceRef,
    offset,
    dragging,
    handlePointerDown,
    handlePointerMove,
    endDrag,
  } = useModalDrag(draggable, open);

  const modalRender = useCallback(
    (node: React.ReactNode) => {
      if (!draggable) {
        return userModalRender ? userModalRender(node) : node;
      }

      const dragged = (
        <div
          ref={surfaceRef}
          className={cn('vokop-modal-drag-surface', dragging && 'vokop-modal-drag-surface--dragging')}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {node}
        </div>
      );

      return userModalRender ? userModalRender(dragged) : dragged;
    },
    [
      draggable,
      dragging,
      endDrag,
      handlePointerDown,
      handlePointerMove,
      offset.x,
      offset.y,
      userModalRender,
    ],
  );

  return (
    <Modal
      centered={centered}
      destroyOnHidden={destroyOnHidden}
      footer={footer}
      width={width}
      open={open}
      mask={mergeModalMask(mask)}
      className={cn('vokop-modal', draggable && 'vokop-modal--draggable', className)}
      classNames={mergeModalClassNames(classNames)}
      styles={mergeModalStyles(styles)}
      modalRender={modalRender}
      closeIcon={closeIcon}
      title={
        title != null ? (
          <VokopModalTitle title={title} subtitle={subtitle} />
        ) : null
      }
      {...props}
    >
      {children}
    </Modal>
  );
}

export type { ModalProps as VokopModalAntdProps };
