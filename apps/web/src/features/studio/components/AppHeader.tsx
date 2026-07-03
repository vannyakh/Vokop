import { useMemo, type ReactNode } from 'react';
import {
  AlertCircle,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Hand,
  HelpCircle,
  Info,
  Loader2,
  MousePointer2,
  Redo2,
  Scissors,
  Settings,
  Undo2,
} from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useProjectNavigation } from '@/features/project/hooks/useProjectNavigation';
import vokopIcon from '@/assets/images/vokop.png';
import { StudioHeaderCenter } from '@/features/studio/components/StudioHeaderCenter';
import { StudioExportButton } from '@/features/studio/components/StudioExportButton';
import {
  StudioMenubar,
  type StudioMenuDefinition,
  type StudioMenuItem,
} from '@/features/studio/components/StudioMenubar';

interface AppHeaderProps {
  onExport: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  transcribing: 'Transcribing',
  translating: 'Translating',
  speaking: 'Voice',
  analyzing: 'Analyzing',
};

function menuIcon(node: ReactNode) {
  return <span className="studio-menubar-lucide">{node}</span>;
}

export function AppHeader({ onExport }: AppHeaderProps) {
  const status = useAppStore((s) => s.status);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const projectStatus = useAppStore((s) => s.projectStatus);
  const projectProgress = useAppStore((s) => s.projectProgress);
  const translatedText = useAppStore((s) => s.translatedText);
  const isExporting = useAppStore((s) => s.isExporting);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const setCanvasTool = useAppStore((s) => s.setCanvasTool);
  const undoCanvas = useAppStore((s) => s.undoCanvas);
  const redoCanvas = useAppStore((s) => s.redoCanvas);
  const canUndoCanvas = useAppStore((s) => s.projectUndoStack.length > 0);
  const canRedoCanvas = useAppStore((s) => s.projectRedoStack.length > 0);
  const { closeProject } = useProjectNavigation();

  const menus = useMemo<StudioMenuDefinition[]>(
    () => [
      {
        id: 'app',
        label: 'Vokop',
        iconTrigger: (
          <img
            src={vokopIcon}
            alt="Vokop"
            className="studio-menubar-app-logo"
            width={16}
            height={16}
            draggable={false}
          />
        ),
        items: [
          {
            id: 'about',
            label: 'About Vokop Studio',
            icon: menuIcon(<Info size={13} />),
            soon: true,
          },
          { id: 'app-sep-1', label: '', separator: true },
          {
            id: 'settings',
            label: 'Settings…',
            icon: menuIcon(<Settings size={13} />),
            shortcut: '⌘,',
            soon: true,
          },
          { id: 'app-sep-2', label: '', separator: true },
          {
            id: 'close-app',
            label: 'Close project',
            icon: menuIcon(<FolderOpen size={13} />),
            shortcut: '⌘W',
            danger: true,
            onSelect: closeProject,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'file',
        label: 'File',
        items: [
          {
            id: 'new',
            label: 'New project',
            icon: menuIcon(<FilePlus2 size={13} />),
            shortcut: '⌘N',
            soon: true,
          },
          {
            id: 'open',
            label: 'Open…',
            icon: menuIcon(<FolderOpen size={13} />),
            shortcut: '⌘O',
            soon: true,
          },
          { id: 'file-sep-1', label: '', separator: true },
          {
            id: 'export',
            label: 'Export',
            icon: menuIcon(<Download size={13} />),
            shortcut: '⌘E',
            disabled: !translatedText || isExporting,
            onSelect: onExport,
          },
          { id: 'file-sep-2', label: '', separator: true },
          {
            id: 'close',
            label: 'Close project',
            icon: menuIcon(<FolderOpen size={13} />),
            shortcut: '⌘W',
            danger: true,
            onSelect: closeProject,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'edit',
        label: 'Edit',
        items: [
          {
            id: 'undo',
            label: 'Undo',
            icon: menuIcon(<Undo2 size={13} />),
            shortcut: '⌘Z',
            disabled: !canUndoCanvas,
            onSelect: undoCanvas,
          },
          {
            id: 'redo',
            label: 'Redo',
            icon: menuIcon(<Redo2 size={13} />),
            shortcut: '⇧⌘Z',
            disabled: !canRedoCanvas,
            onSelect: redoCanvas,
          },
          { id: 'edit-sep-1', label: '', separator: true },
          {
            id: 'cut',
            label: 'Cut',
            icon: menuIcon(<Scissors size={13} />),
            shortcut: '⌘X',
            soon: true,
          },
          {
            id: 'copy',
            label: 'Copy',
            icon: menuIcon(<Copy size={13} />),
            shortcut: '⌘C',
            soon: true,
          },
          {
            id: 'paste',
            label: 'Paste',
            icon: menuIcon(<ClipboardPaste size={13} />),
            shortcut: '⌘V',
            soon: true,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'view',
        label: 'View',
        items: [
          {
            id: 'select',
            label: 'Select tool',
            icon: menuIcon(<MousePointer2 size={13} />),
            disabled: canvasTool === 'select',
            onSelect: () => setCanvasTool('select'),
          },
          {
            id: 'pan',
            label: 'Pan tool',
            icon: menuIcon(<Hand size={13} />),
            disabled: canvasTool === 'pan',
            onSelect: () => setCanvasTool('pan'),
          },
          { id: 'view-sep-1', label: '', separator: true },
          {
            id: 'timeline',
            label: 'Show timeline',
            soon: true,
          },
          {
            id: 'fullscreen',
            label: 'Enter full screen',
            shortcut: '⌃⌘F',
            soon: true,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'window',
        label: 'Window',
        items: [
          {
            id: 'minimize',
            label: 'Minimize',
            shortcut: '⌘M',
            soon: true,
          },
          {
            id: 'zoom',
            label: 'Zoom',
            soon: true,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'help',
        label: 'Help',
        items: [
          {
            id: 'docs',
            label: 'Vokop Help',
            icon: menuIcon(<HelpCircle size={13} />),
            soon: true,
          },
          {
            id: 'shortcuts',
            label: 'Keyboard shortcuts',
            soon: true,
          },
        ] satisfies StudioMenuItem[],
      },
    ],
    [
      canRedoCanvas,
      canUndoCanvas,
      canvasTool,
      closeProject,
      isExporting,
      onExport,
      redoCanvas,
      setCanvasTool,
      translatedText,
      undoCanvas,
    ],
  );

  return (
    <header className="studio-header">
      <div className="studio-header-left">
        <StudioMenubar menus={menus} />
      </div>

      <StudioHeaderCenter />

      <div className="studio-header-actions">
        {status === 'error' && errorMessage ? (
          <div className="studio-header-status studio-header-status--error" title={errorMessage}>
            <AlertCircle size={12} />
            <span className="truncate">{errorMessage}</span>
          </div>
        ) : null}

        {status !== 'idle' && status !== 'error' ? (
          <div className="studio-header-status studio-header-status--busy">
            <Loader2 className="animate-spin" size={12} />
            <span>{STATUS_LABELS[status] ?? status}</span>
          </div>
        ) : null}

        {projectStatus === 'processing' ? (
          <div className="studio-header-status studio-header-status--busy">
            <Loader2 className="animate-spin" size={12} />
            <span>Sync {Math.round(projectProgress)}%</span>
          </div>
        ) : null}

        {projectStatus === 'failed' ? (
          <div className="studio-header-status studio-header-status--error">
            <AlertCircle size={12} />
            <span>Project failed</span>
          </div>
        ) : null}

        <StudioExportButton
          onClick={onExport}
          loading={isExporting}
          disabled={!translatedText || isExporting}
        />
      </div>
    </header>
  );
}
