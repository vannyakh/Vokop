import { MousePointer2, Hand } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import type { CanvasTool } from '@/types/canvas';

const TOOLS: { id: CanvasTool; label: string; icon: typeof MousePointer2 }[] = [
  { id: 'select', label: 'Select (V)', icon: MousePointer2 },
  { id: 'pan', label: 'Pan (H)', icon: Hand },
];

export function StudioHeaderCanvasTools() {
  const canvasTool = useAppStore((s) => s.canvasTool);
  const setCanvasTool = useAppStore((s) => s.setCanvasTool);

  return (
    <div className="studio-header-canvas-tools" role="toolbar" aria-label="Canvas tools">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            type="button"
            title={tool.label}
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
