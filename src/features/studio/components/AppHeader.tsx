import {
  FileVideo,
  Languages,
  Loader2,
  Download,
  Trash2,
  MonitorPlay,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useProjectNavigation } from '@/features/project/hooks/useProjectNavigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

interface AppHeaderProps {
  onExport: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  transcribing: 'Transcribing audio',
  translating: 'Translating script',
  speaking: 'Generating voice',
  analyzing: 'Analyzing video',
};

export function AppHeader({ onExport }: AppHeaderProps) {
  const videoFile = useAppStore((s) => s.videoFile);
  const detectedLanguage = useAppStore((s) => s.detectedLanguage);
  const status = useAppStore((s) => s.status);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const translatedText = useAppStore((s) => s.translatedText);
  const isExporting = useAppStore((s) => s.isExporting);
  const { closeProject } = useProjectNavigation();

  const fileName = videoFile?.name ?? 'Untitled project';

  return (
    <header className="h-14 shrink-0 studio-glass border-b border-white/5 flex items-center justify-between px-5 relative z-20">
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={closeProject}
          className="flex items-center gap-3 group shrink-0"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-[var(--accent)] to-[#c97a1e] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[rgba(232,163,61,0.25)]/25 group-hover:shadow-[rgba(232,163,61,0.25)]/40 transition-shadow">
            <MonitorPlay size={18} />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-bold tracking-tight text-white leading-none">Vokop Studio</p>
            <p className="text-[10px] text-faint mt-0.5 truncate max-w-[180px]">{fileName}</p>
          </div>
        </button>

        <div className="h-5 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2">
          <Badge className="hidden md:flex">
            <FileVideo size={12} className="text-muted" />
            <span>{videoFile?.size ? (videoFile.size / (1024 * 1024)).toFixed(1) : 0} MB</span>
          </Badge>
          {detectedLanguage && (
            <Badge variant="info">
              <Languages size={12} className="text-accent" />
              <span>{detectedLanguage}</span>
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status === 'error' && errorMessage && (
          <div
            className="flex items-center gap-2 text-[10px] font-medium text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 max-w-[240px]"
            title={errorMessage}
          >
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {status !== 'idle' && status !== 'error' && (
          <div className="flex items-center gap-2 text-[10px] font-semibold text-accent bg-accent-soft px-3 py-1.5 rounded-lg border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)]">
            <Loader2 className="animate-spin shrink-0" size={12} />
            <span>{STATUS_LABELS[status] ?? status}…</span>
          </div>
        )}

        <Button size="sm" onClick={onExport} disabled={!translatedText || isExporting}>
          {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
          Export
        </Button>

        <div className="h-6 w-px bg-white/10" />

        <IconButton onClick={closeProject} title="Close project">
          <Trash2 size={18} />
        </IconButton>
      </div>
    </header>
  );
}
