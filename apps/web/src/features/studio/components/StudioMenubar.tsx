import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export type StudioMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  soon?: boolean;
  hasSubmenu?: boolean;
  onSelect?: () => void;
  separator?: boolean;
};

export type StudioMenuDefinition = {
  id: string;
  label: string;
  /** Render a logo/icon trigger instead of text (app menu). */
  iconTrigger?: ReactNode;
  items: StudioMenuItem[];
};

interface StudioMenuProps {
  menu: StudioMenuDefinition;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  hoverArmed: boolean;
}

function StudioMenu({ menu, open, onOpen, onClose, hoverArmed }: StudioMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  return (
    <div
      ref={ref}
      className="studio-menubar-item"
      onMouseEnter={() => {
        if (hoverArmed) onOpen();
      }}
    >
      <button
        type="button"
        className={cn(
          'studio-menubar-trigger',
          menu.iconTrigger && 'studio-menubar-trigger--icon',
          open && 'is-open',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? onClose() : onOpen())}
      >
        {menu.iconTrigger ?? menu.label}
      </button>
      {open ? (
        <div id={menuId} className="studio-menubar-dropdown" role="menu">
          {menu.items.map((item) =>
            item.separator ? (
              <div key={item.id} className="studio-menubar-separator" role="separator" />
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={cn(
                  'studio-menubar-option',
                  item.danger && 'is-danger',
                  (item.disabled || item.soon) && 'is-disabled',
                )}
                disabled={item.disabled || item.soon}
                onClick={() => {
                  if (item.disabled || item.soon) return;
                  item.onSelect?.();
                  onClose();
                }}
              >
                <span className="studio-menubar-option-main">
                  <span className="studio-menubar-option-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="studio-menubar-option-label">{item.label}</span>
                  {item.soon ? <span className="studio-menubar-soon">Soon</span> : null}
                </span>
                {item.hasSubmenu ? (
                  <ChevronRight size={12} className="studio-menubar-submenu-caret" />
                ) : item.shortcut ? (
                  <span className="studio-menubar-shortcut">{item.shortcut}</span>
                ) : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

interface StudioMenubarProps {
  menus: StudioMenuDefinition[];
}

export function StudioMenubar({ menus }: StudioMenubarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="studio-menubar" role="menubar">
      <div className="studio-menubar-menus">
        {menus.map((menu) => (
          <StudioMenu
            key={menu.id}
            menu={menu}
            open={openMenuId === menu.id}
            hoverArmed={openMenuId != null}
            onOpen={() => setOpenMenuId(menu.id)}
            onClose={() => setOpenMenuId(null)}
          />
        ))}
      </div>
    </div>
  );
}
