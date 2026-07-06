import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  contextMenuAnchorAt,
  Kbd,
} from '@vokop/ui/shadcn';
import { cn } from '@/lib/cn';
import { shortcutTokens } from '@/features/studio/constants/keyboardShortcuts';
import { formatShortcutTokens } from '@/features/studio/lib/shortcutKeys';

export interface EditorContextMenuTarget {
  x: number;
  y: number;
}

export interface EditorMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  shortcutKey?: string;
  disabled?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
  submenu?: EditorMenuItem[];
}

interface EditorContextMenuProps {
  target: EditorContextMenuTarget | null;
  title: string;
  items: EditorMenuItem[];
  onClose: () => void;
  className?: string;
}

function MenuShortcut({ shortcutKey }: { shortcutKey: string }) {
  const tokens = shortcutTokens(shortcutKey);
  if (!tokens?.length) return null;
  const labels = formatShortcutTokens(tokens);
  return (
    <span className="studio-context-menu-shortcuts">
      {labels.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  );
}

function MenuIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="studio-context-menu-icon" aria-hidden>
      <Icon size={15} strokeWidth={1.75} />
    </span>
  );
}

function renderMenuItem(
  item: EditorMenuItem,
  run: (fn: () => void) => void,
): ReactNode {
  if (item.submenu?.length) {
    return (
      <ContextMenuSub key={item.id}>
        <ContextMenuSubTrigger disabled={item.disabled}>
          <MenuIcon icon={item.icon} />
          <span>{item.label}</span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="studio-context-menu">
          {item.submenu.map((sub) => renderMenuItem(sub, run))}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  }

  return (
    <ContextMenuItem
      key={item.id}
      variant={item.destructive ? 'destructive' : 'default'}
      disabled={item.disabled}
      onClick={() => run(item.onClick)}
    >
      <MenuIcon icon={item.icon} />
      <span>{item.label}</span>
      {item.shortcutKey ? <MenuShortcut shortcutKey={item.shortcutKey} /> : null}
    </ContextMenuItem>
  );
}

export function EditorContextMenu({
  target,
  title,
  items,
  onClose,
  className,
}: EditorContextMenuProps) {
  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <ContextMenu open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <ContextMenuContent
        anchor={target ? contextMenuAnchorAt(target.x, target.y) : undefined}
        side="right"
        align="start"
        sideOffset={6}
        className={cn('studio-context-menu z-[200]', className)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <ContextMenuGroup>
          {title ? <ContextMenuLabel>{title}</ContextMenuLabel> : null}
        </ContextMenuGroup>
        {items.map((item) => (
          <div key={item.id}>
            {item.separatorBefore ? <ContextMenuSeparator /> : null}
            {renderMenuItem(item, run)}
          </div>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
