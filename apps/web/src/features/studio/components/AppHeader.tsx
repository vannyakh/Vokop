import { useMemo, useState, useEffect, type ReactNode } from 'react';
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
  LayoutDashboard,
  Loader2,
  MonitorDown,
  MousePointer2,
  PanelRight,
  Redo2,
  Scissors,
  Settings,
  Undo2,
} from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useProjectNavigation } from '@/features/project/hooks/useProjectNavigation';
import { useTranslation } from '@/features/settings';
import { ASSET_IMAGES, ASSET_ICONS } from '@/assets/support';
import { StudioHeaderCenter } from '@/features/studio/components/StudioHeaderCenter';
import { StudioExportButton } from '@/features/studio/components/StudioExportButton';
import { StudioHeaderIconAction } from '@/features/studio/components/StudioHeaderIconAction';
import {
  StudioHeaderModals,
  type StudioHeaderModalId,
} from '@/features/studio/components/StudioHeaderModals';
import {
  StudioMenubar,
  type StudioMenuDefinition,
  type StudioMenuItem,
} from '@/features/studio/components/StudioMenubar';
import { shortcutMenuLabel } from '@/features/studio/constants/keyboardShortcuts';
import { subscribeStudioChromeModal } from '@/features/studio/lib/studioChrome';
import { Tooltip } from '@vokop/ui/antd';

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
  const { t } = useTranslation();
  const status = useAppStore((s) => s.status);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const projectStatus = useAppStore((s) => s.projectStatus);
  const projectProgress = useAppStore((s) => s.projectProgress);
  const videoUrl = useAppStore((s) => s.videoUrl);
  const projectId = useAppStore((s) => s.projectId);
  const isExporting = useAppStore((s) => s.isExporting);
  const editorOpen = useAppStore((s) => s.editorOpen);
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  // Export works on the raw timeline too — only require a loaded project, not a translation.
  const canExport = Boolean(videoUrl || projectId) && !isExporting;
  const [headerModal, setHeaderModal] = useState<StudioHeaderModalId | null>(null);
  const canvasTool = useAppStore((s) => s.canvasTool);
  const setCanvasTool = useAppStore((s) => s.setCanvasTool);
  const undoCanvas = useAppStore((s) => s.undoCanvas);
  const redoCanvas = useAppStore((s) => s.redoCanvas);
  const copyTimelineSelection = useAppStore((s) => s.copyTimelineSelection);
  const cutTimelineSelection = useAppStore((s) => s.cutTimelineSelection);
  const pasteTimelineClipboard = useAppStore((s) => s.pasteTimelineClipboard);
  const togglePreviewFullscreen = useAppStore((s) => s.togglePreviewFullscreen);
  const canUndoCanvas = useAppStore((s) => s.projectUndoStack.length > 0);
  const canRedoCanvas = useAppStore((s) => s.projectRedoStack.length > 0);
  const { closeProject } = useProjectNavigation();

  useEffect(() => subscribeStudioChromeModal(setHeaderModal), []);

  const toggleInspectorPanel = () => {
    if (editorOpen && activeTab === 'inspector') {
      setEditorOpen(false);
      return;
    }
    setActiveTab('inspector');
    setEditorOpen(true);
  };

  const inspectorActive = editorOpen && activeTab === 'inspector';

  const menus = useMemo<StudioMenuDefinition[]>(
    () => [
      {
        id: 'app',
        label: 'Vokop',
        iconTrigger: (
          <img
            src={ASSET_ICONS.icon}
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
            label: t('menuAbout' as any),
            icon: menuIcon(<Info size={13} />),
            soon: true,
          },
          { id: 'app-sep-1', label: '', separator: true },
          {
            id: 'settings',
            label: t('menuSettings' as any),
            icon: menuIcon(<Settings size={13} />),
            shortcut: shortcutMenuLabel('shortcutSettings'),
            onSelect: () => setHeaderModal('settings'),
          },
          { id: 'app-sep-2', label: '', separator: true },
          {
            id: 'close-app',
            label: t('menuCloseProject' as any),
            icon: menuIcon(<FolderOpen size={13} />),
            shortcut: '⌘W',
            danger: true,
            onSelect: closeProject,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'file',
        label: t('menuFile' as any),
        items: [
          {
            id: 'new',
            label: t('menuNewProject' as any),
            icon: menuIcon(<FilePlus2 size={13} />),
            shortcut: '⌘N',
            soon: true,
          },
          {
            id: 'open',
            label: t('menuOpen' as any),
            icon: menuIcon(<FolderOpen size={13} />),
            shortcut: '⌘O',
            soon: true,
          },
          { id: 'file-sep-1', label: '', separator: true },
          {
            id: 'export',
            label: t('menuExport' as any),
            icon: menuIcon(<Download size={13} />),
            shortcut: '⌘E',
            disabled: !canExport,
            onSelect: onExport,
          },
          { id: 'file-sep-2', label: '', separator: true },
          {
            id: 'close',
            label: t('menuCloseProject' as any),
            icon: menuIcon(<FolderOpen size={13} />),
            shortcut: '⌘W',
            danger: true,
            onSelect: closeProject,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'edit',
        label: t('menuEdit' as any),
        items: [
          {
            id: 'undo',
            label: t('menuUndo' as any),
            icon: menuIcon(<Undo2 size={13} />),
            shortcut: shortcutMenuLabel('shortcutUndo'),
            disabled: !canUndoCanvas,
            onSelect: undoCanvas,
          },
          {
            id: 'redo',
            label: t('menuRedo' as any),
            icon: menuIcon(<Redo2 size={13} />),
            shortcut: shortcutMenuLabel('shortcutRedo'),
            disabled: !canRedoCanvas,
            onSelect: redoCanvas,
          },
          { id: 'edit-sep-1', label: '', separator: true },
          {
            id: 'cut',
            label: t('menuCut' as any),
            icon: menuIcon(<Scissors size={13} />),
            shortcut: shortcutMenuLabel('shortcutCut'),
            onSelect: cutTimelineSelection,
          },
          {
            id: 'copy',
            label: t('menuCopy' as any),
            icon: menuIcon(<Copy size={13} />),
            shortcut: shortcutMenuLabel('shortcutCopy'),
            onSelect: copyTimelineSelection,
          },
          {
            id: 'paste',
            label: t('menuPaste' as any),
            icon: menuIcon(<ClipboardPaste size={13} />),
            shortcut: shortcutMenuLabel('shortcutPaste'),
            onSelect: pasteTimelineClipboard,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'view',
        label: t('menuView' as any),
        items: [
          {
            id: 'select',
            label: t('menuSelectTool' as any),
            icon: menuIcon(<MousePointer2 size={13} />),
            shortcut: shortcutMenuLabel('shortcutSelectTool'),
            disabled: canvasTool === 'select',
            onSelect: () => setCanvasTool('select'),
          },
          {
            id: 'pan',
            label: t('menuPanTool' as any),
            icon: menuIcon(<Hand size={13} />),
            shortcut: shortcutMenuLabel('shortcutPanTool'),
            disabled: canvasTool === 'pan',
            onSelect: () => setCanvasTool('pan'),
          },
          { id: 'view-sep-1', label: '', separator: true },
          {
            id: 'timeline',
            label: t('menuShowTimeline' as any),
            soon: true,
          },
          {
            id: 'fullscreen',
            label: t('menuFullscreen' as any),
            shortcut: shortcutMenuLabel('shortcutFullscreen'),
            onSelect: togglePreviewFullscreen,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'window',
        label: t('menuWindow' as any),
        items: [
          {
            id: 'minimize',
            label: t('menuMinimize' as any),
            shortcut: '⌘M',
            soon: true,
          },
          {
            id: 'zoom',
            label: t('menuZoom' as any),
            soon: true,
          },
        ] satisfies StudioMenuItem[],
      },
      {
        id: 'help',
        label: t('menuHelp' as any),
        items: [
          {
            id: 'docs',
            label: t('menuVokopHelp' as any),
            icon: menuIcon(<HelpCircle size={13} />),
            soon: true,
          },
          {
            id: 'shortcuts',
            label: t('menuShortcuts' as any),
            onSelect: () => setHeaderModal('help'),
          },
        ] satisfies StudioMenuItem[],
      },
    ],
    [
      canExport,
      canRedoCanvas,
      canUndoCanvas,
      canvasTool,
      closeProject,
      copyTimelineSelection,
      cutTimelineSelection,
      onExport,
      pasteTimelineClipboard,
      redoCanvas,
      setCanvasTool,
      t,
      togglePreviewFullscreen,
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

        <div className="studio-header-icon-group" role="toolbar" aria-label={t('headerToolbarLabel' as any)}>
          <StudioHeaderIconAction
            tooltip={t('headerTooltipDesktop' as any)}
            label={t('headerTooltipDesktop' as any)}
            onClick={() => setHeaderModal('desktop')}
          >
            <MonitorDown size={16} />
          </StudioHeaderIconAction>
          <StudioHeaderIconAction
            tooltip={t('headerTooltipWorkspace' as any)}
            label={t('headerTooltipWorkspace' as any)}
            onClick={() => setHeaderModal('workspace')}
          >
            <LayoutDashboard size={16} />
          </StudioHeaderIconAction>
          <StudioHeaderIconAction
            tooltip={t('headerTooltipHelp' as any)}
            label={t('headerTooltipHelp' as any)}
            onClick={() => setHeaderModal('help')}
          >
            <HelpCircle size={16} />
          </StudioHeaderIconAction>
          <StudioHeaderIconAction
            tooltip={t('headerTooltipProperties' as any)}
            label={t('headerTooltipProperties' as any)}
            active={inspectorActive}
            onClick={toggleInspectorPanel}
          >
            <PanelRight size={16} />
          </StudioHeaderIconAction>
          <StudioHeaderIconAction
            tooltip={t('headerTooltipSettings' as any)}
            label={t('headerTooltipSettings' as any)}
            onClick={() => setHeaderModal('settings')}
          >
            <Settings size={16} />
          </StudioHeaderIconAction>
        </div>

        <Tooltip
          title={
            isExporting
              ? t('exporting')
              : canExport
                ? t('headerTooltipExport' as any)
                : t('headerTooltipExportDisabled' as any)
          }
          placement="bottom"
          mouseEnterDelay={0.35}
          classNames={{ root: 'studio-header-tooltip' }}
        >
          <span className="studio-export-btn-wrap">
            <StudioExportButton
              onClick={onExport}
              loading={isExporting}
              disabled={!canExport}
            />
          </span>
        </Tooltip>
      </div>

      <StudioHeaderModals active={headerModal} onClose={() => setHeaderModal(null)} />
    </header>
  );
}
