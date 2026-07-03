import {
  Languages,
  Loader2,
  Download,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useProjectNavigation } from '@/features/project/hooks/useProjectNavigation';
import { VokopLogo } from '@/components/brand/VokopLogo';
import { Badge, Button, IconButton } from '@vokop/ui';
import { formatAppVersion } from '@/constants/version';
import { StudioHeaderCenter } from '@/features/studio/components/StudioHeaderCenter';

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
  const detectedLanguage = useAppStore((s) => s.detectedLanguage);
  const status = useAppStore((s) => s.status);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const translatedText = useAppStore((s) => s.translatedText);
  const isExporting = useAppStore((s) => s.isExporting);
  const { closeProject } = useProjectNavigation();

  return (
    <header className="studio-header">
      <div className="studio-header-brand">
        <VokopLogo className="h-7 sm:h-8" />
        <div className="hidden sm:block min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-display text-sm font-semibold tracking-tight leading-none" style={{ color: 'var(--text)' }}>
              Studio
            </p>
            <span className="font-mono text-[10px] text-faint opacity-55">{formatAppVersion()}</span>
          </div>
        </div>

        {detectedLanguage && (
          <>
            <div className="studio-header-divider hidden lg:block" />
            <Badge variant="info" className="hidden lg:flex">
              <Languages size={12} className="text-accent" />
              <span>{detectedLanguage}</span>
            </Badge>
          </>
        )}
      </div>

      <StudioHeaderCenter />

      <div className="studio-header-actions">
        {status === 'error' && errorMessage && (
          <div
            className="hidden sm:flex items-center gap-2 text-[10px] font-medium text-[#e8746a] bg-[rgba(232,116,106,0.1)] px-3 py-1.5 rounded-lg border border-[rgba(232,116,106,0.22)] max-w-[220px]"
            title={errorMessage}
          >
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {status !== 'idle' && status !== 'error' && (
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-semibold text-accent bg-accent-soft px-3 py-1.5 rounded-lg border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)]">
            <Loader2 className="animate-spin shrink-0" size={12} />
            <span>{STATUS_LABELS[status] ?? status}…</span>
          </div>
        )}

        <Button size="sm" onClick={onExport} disabled={!translatedText || isExporting}>
          {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
          Export
        </Button>

        <IconButton onClick={closeProject} title="Close project">
          <Trash2 size={18} />
        </IconButton>
      </div>
    </header>
  );
}
