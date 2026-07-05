import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FolderOpen, Home, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useProjectNavigation } from '@/features/project/hooks/useProjectNavigation';
import { useRecentProjects } from '@/features/projects/hooks/useRecentProjects';
import { useTranslation } from '@/features/settings';
import { getAspectRatioOption } from '@/features/studio/constants/aspectRatios';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import { ROUTES } from '@/routes/paths';
import { Dropdown, type MenuProps } from '@vokop/ui/antd';
import { StudioStatusbarMonitor } from '@/features/studio/components/StudioStatusbarMonitor';

function statusLabel(
  status: string | undefined,
  progress: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (status === 'processing') {
    return t('libraryStatusProcessingValue', { progress: Math.round(progress) });
  }
  if (status === 'failed') return t('libraryStatusFailed');
  if (status === 'done') return t('libraryStatusDone');
  return 'Draft';
}

const STATUSBAR_COLLAPSED_KEY = 'vokop-statusbar-collapsed';

function readStatusbarCollapsed(): boolean {
  try {
    return localStorage.getItem(STATUSBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function StudioProjectStatusBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openProject, closeProject } = useProjectNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readStatusbarCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STATUSBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const projectId = useAppStore((s) => s.projectId);
  const projectName = useAppStore((s) => s.projectName);
  const projectStatus = useAppStore((s) => s.projectStatus);
  const projectProgress = useAppStore((s) => s.projectProgress);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const duration = useAppStore((s) => s.duration);
  const isExporting = useAppStore((s) => s.isExporting);

  const { projects, isLoading, isMock } = useRecentProjects({ enabled: menuOpen });

  const aspectLabel = getAspectRatioOption(aspectRatio)?.label ?? aspectRatio;
  const statusText = statusLabel(projectStatus, projectProgress, t);
  const displayName = projectName.trim() || t('createBlankProjectTitle');

  const menuItems = useMemo((): MenuProps['items'] => {
    const recent = projects.slice(0, 8).map((project) => ({
      key: project.id,
      label: (
        <span className="studio-statusbar-menu-row">
          <span className="studio-statusbar-menu-title">{project.title}</span>
          <span className="studio-statusbar-menu-meta">{project.meta}</span>
        </span>
      ),
      disabled: project.id === projectId,
      onClick: () => {
        setMenuOpen(false);
        if (project.id !== projectId) openProject(project.id);
      },
    }));

    return [
      ...(recent.length > 0
        ? [{ type: 'group' as const, label: t('libraryTitleProjects'), children: recent }]
        : isLoading
          ? [
              {
                key: 'loading',
                disabled: true,
                label: (
                  <span className="studio-statusbar-menu-loading">
                    <Loader2 size={12} className="animate-spin" />
                    {t('libraryLoadingProjects')}
                  </span>
                ),
              },
            ]
          : [
              {
                key: 'empty',
                disabled: true,
                label: t('libraryEmptyProjectsMsg'),
              },
            ]),
      { type: 'divider' as const },
      {
        key: 'home',
        icon: <Home size={13} />,
        label: t('headerWorkspaceHome'),
        onClick: () => {
          setMenuOpen(false);
          navigate(ROUTES.home);
        },
      },
      {
        key: 'close',
        label: t('menuCloseProject'),
        onClick: () => {
          setMenuOpen(false);
          closeProject();
        },
      },
    ];
  }, [
    closeProject,
    isLoading,
    navigate,
    openProject,
    projectId,
    projects,
    t,
  ]);

  return (
    <div className={cn('studio-statusbar-root', collapsed && 'is-collapsed')}>
      <div className="studio-statusbar-panel" aria-hidden={collapsed}>
        <footer className="studio-statusbar" aria-label={t('libraryTitleProjects')}>
          <div className="studio-statusbar-left">
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              overlayClassName="studio-statusbar-dropdown"
            >
              <button
                type="button"
                className={cn(
                  'studio-statusbar-item studio-statusbar-item--project',
                  menuOpen && 'is-open',
                )}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <FolderOpen size={12} aria-hidden />
                <span className="studio-statusbar-item-label">{t('libraryTitleProjects')}</span>
                <span className="studio-statusbar-item-sep" aria-hidden />
                <span className="studio-statusbar-project-name">{displayName}</span>
                <ChevronDown size={11} className="studio-statusbar-chevron" aria-hidden />
              </button>
            </Dropdown>

            <span
              className={cn(
                'studio-statusbar-item studio-statusbar-item--status',
                projectStatus === 'processing' && 'is-processing',
                projectStatus === 'failed' && 'is-failed',
              )}
            >
              <span className="studio-statusbar-status-dot" aria-hidden />
              {statusText}
            </span>

            {isMock && menuOpen && (
              <span className="studio-statusbar-item studio-statusbar-item--hint">Demo</span>
            )}
          </div>

          <StudioStatusbarMonitor active={!collapsed} />

          <div className="studio-statusbar-right">
            {duration > 0 && (
              <span className="studio-statusbar-item studio-statusbar-item--readonly">
                {formatStudioTimecode(duration)}
              </span>
            )}
            <span className="studio-statusbar-item studio-statusbar-item--readonly">{aspectLabel}</span>
            {isExporting && (
              <span className="studio-statusbar-item studio-statusbar-item--active">
                <Loader2 size={11} className="animate-spin" aria-hidden />
                Export
              </span>
            )}
            <button
              type="button"
              className="studio-statusbar-item"
              onClick={() => navigate(ROUTES.home)}
            >
              {t('libraryViewAll')}
            </button>
          </div>
        </footer>
      </div>

      <button
        type="button"
        className="studio-statusbar-fab"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show project bar' : 'Hide project bar'}
        title={collapsed ? 'Show project bar' : 'Hide project bar'}
      >
        <span className="studio-statusbar-fab-icon" aria-hidden>
          {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>
    </div>
  );
}
