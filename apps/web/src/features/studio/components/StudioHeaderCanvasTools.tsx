import { MousePointer2, Hand } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/features/settings';
import { useAppStore } from '@/features/project';
import { formatMenuShortcut } from '@/features/studio/lib/shortcutKeys';
import type { CanvasTool } from '@/types/canvas';

const TOOLS: { id: CanvasTool; labelKey: 'menuSelectTool' | 'menuPanTool'; shortcut: ['V'] | ['H']; icon: typeof MousePointer2 }[] = [
  { id: 'select', labelKey: 'menuSelectTool', shortcut: ['V'], icon: MousePointer2 },
  { id: 'pan', labelKey: 'menuPanTool', shortcut: ['H'], icon: Hand },
];

export function StudioHeaderCanvasTools() {
  const { t } = useTranslation();
  const canvasTool = useAppStore((s) => s.canvasTool);
  const setCanvasTool = useAppStore((s) => s.setCanvasTool);

  return (
    <div className="studio-header-canvas-tools" role="toolbar" aria-label="Canvas tools">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const label = t(tool.labelKey as any);
        const shortcut = formatMenuShortcut(tool.shortcut);
        return (
          <button
            key={tool.id}
            type="button"
            title={`${label} (${shortcut})`}
            aria-pressed={canvasTool === tool.id}
            onClick={() => setCanvasTool(tool.id)}
            className={cn('studio-header-canvas-tool-btn', canvasTool === tool.id && 'active')}
          >
            <Icon size={13} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
