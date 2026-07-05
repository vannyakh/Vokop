import { useState } from 'react';
import {
  ArrowRight,
  Clock,
  Download,
  Loader2,
  Play,
  RotateCcw,
  Trash2,
  Undo2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Popconfirm } from '@vokop/ui/antd';
import { useRecentProjects } from '@/features/projects/hooks/useRecentProjects';
import { useProjectNavigation } from '@/features/project/hooks/useProjectNavigation';
import { getProjectMeta } from '@/features/projects/lib/projectDisplay';
import { useTranslation } from '@/features/settings';
import defaultProjectThumb from '@/assets/project.png';
import { cn } from '@/lib/cn';

const STATUS_LABELS = {
  done: 'libraryStatusDone',
  processing: 'libraryStatusProcessing',
  failed: 'libraryStatusFailed',
} as const;

export function RecentProjectsSection() {
  const [showTrash, setShowTrash] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row');
  const { t } = useTranslation();
  const {
    projects,
    isMock,
    isLoading,
    isError,
    trashCount,
    moveToTrash,
    restoreProject,
    permanentDelete,
    emptyTrash,
    isMutating,
  } = useRecentProjects({ trash: showTrash });
  const { openProject } = useProjectNavigation();

  return (
    <section className="landing-section landing-history-section">
      <div className="landing-section-head-row">
        <div>
          <span className="landing-section-eyebrow">{t('libraryEyebrow')}</span>
          <h2 className="landing-section-title font-display">
            {showTrash ? t('libraryTitleTrash') : t('libraryTitleProjects')}
          </h2>
        </div>
        <div className="landing-history-actions">
          <div className="landing-view-toggle">
            <button
              type="button"
              className={cn("landing-view-toggle-btn", viewMode === 'row' && "is-active")}
              onClick={() => setViewMode('row')}
              title={t('libraryViewRowTooltip')}
            >
              <List size={14} />
            </button>
            <button
              type="button"
              className={cn("landing-view-toggle-btn", viewMode === 'grid' && "is-active")}
              onClick={() => setViewMode('grid')}
              title={t('libraryViewGridTooltip')}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <span className="landing-history-actions-divider" />

          {!isMock && (
            <button
              type="button"
              className="landing-view-all"
              disabled={isMutating}
              onClick={() => setShowTrash((v) => !v)}
            >
              {showTrash ? t('libraryBackToProjects') : `${t('libraryTitleTrash')}${trashCount > 0 ? ` (${trashCount})` : ''}`}
            </button>
          )}
          {showTrash && !isMock && projects.length > 0 && (
            <Popconfirm
              title={t('libraryEmptyTrashConfirmTitle')}
              description={t('libraryEmptyTrashConfirmDesc')}
              okText={t('libraryEmptyTrash')}
              cancelText={t('libraryOpCancel')}
              okButtonProps={{ danger: true, loading: isMutating }}
              disabled={isMutating}
              onConfirm={() => emptyTrash()}
            >
              <button
                type="button"
                className="landing-view-all landing-view-all--danger"
                disabled={isMutating}
              >
                {t('libraryEmptyTrash')}
              </button>
            </Popconfirm>
          )}
          {!showTrash && (
            <button type="button" className="landing-view-all" disabled={isMock}>
              {t('libraryViewAll')}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="landing-history-list">
          <div className="landing-history-empty">
            <Loader2 size={18} className="animate-spin" />
            <span>{showTrash ? t('libraryLoadingTrash') : t('libraryLoadingProjects')}</span>
          </div>
        </div>
      ) : isError ? (
        <div className="landing-history-list">
          <div className="landing-history-empty">
            {showTrash ? t('libraryErrorTrash') : t('libraryErrorProjects')}
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="landing-history-list">
          <div className="landing-history-empty">
            {showTrash
              ? t('libraryEmptyTrashMsg')
              : t('libraryEmptyProjectsMsg')}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="landing-history-grid">
          {projects.map((project) => (
            <div key={project.id} className="landing-history-grid-card">
              <button
                type="button"
                className="landing-grid-card-cover"
                disabled={isMock || showTrash}
                onClick={() => !isMock && !showTrash && openProject(project.id)}
              >
                <div
                  className={`landing-thumb landing-thumb-${project.thumb}`}
                  data-dur={project.duration}
                  style={{
                    backgroundImage: `url(${project.thumbnailUrl || defaultProjectThumb})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <Play size={18} fill="currentColor" />
                </div>
              </button>

              <div className="landing-grid-card-details">
                <div className="landing-grid-card-title">{project.title}</div>
                <div className="landing-grid-card-meta">
                  <span>
                    {project.updatedAt
                      ? getProjectMeta(project.status, project.progress, project.updatedAt, t)
                      : project.meta}
                  </span>
                </div>
              </div>

              <div className="landing-grid-card-footer">
                {!showTrash ? (
                  <span className={`landing-row-status landing-row-status-${project.status}`}>
                    <span className="dot" />
                    {t(STATUS_LABELS[project.status])}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">{t('libraryInTrash')}</span>
                )}

                <div className="landing-row-ops">
                  {showTrash ? (
                    <>
                      <button
                        type="button"
                        className="landing-row-ops-btn"
                        title={t('libraryOpRestore')}
                        disabled={isMutating}
                        onClick={() => void restoreProject(project.id)}
                      >
                        <Undo2 size={13} />
                      </button>
                      <Popconfirm
                        title={t('libraryOpDeletePermanentlyConfirmTitle')}
                        description={t('libraryOpDeletePermanentlyConfirm', { title: project.title })}
                        okText={t('libraryOpDelete')}
                        cancelText={t('libraryOpCancel')}
                        okButtonProps={{ danger: true, loading: isMutating }}
                        disabled={isMutating}
                        onConfirm={() => permanentDelete(project.id)}
                      >
                        <button
                          type="button"
                          className="landing-row-ops-btn landing-row-ops-btn--danger"
                          title={t('libraryOpDeletePermanently')}
                          disabled={isMutating}
                        >
                          <Trash2 size={13} />
                        </button>
                      </Popconfirm>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="landing-row-ops-btn"
                        title={
                          project.status === 'failed'
                            ? t('libraryOpRetry')
                            : project.status === 'processing'
                              ? t('libraryOpViewProgress')
                              : t('libraryOpDownload')
                        }
                        disabled={isMock}
                      >
                        {project.status === 'failed' ? (
                          <RotateCcw size={13} />
                        ) : project.status === 'processing' ? (
                          <Clock size={13} />
                        ) : (
                          <Download size={13} />
                        )}
                      </button>

                      <Popconfirm
                        title={t('libraryOpMoveToTrashConfirmTitle')}
                        description={t('libraryOpMoveToTrashConfirm', { title: project.title })}
                        okText={t('libraryOpMoveToTrash')}
                        cancelText={t('libraryOpCancel')}
                        okButtonProps={{ danger: true, loading: isMutating }}
                        disabled={isMutating}
                        onConfirm={() => moveToTrash(project.id)}
                      >
                        <button
                          type="button"
                          className="landing-row-ops-btn"
                          title={t('libraryOpMoveToTrash')}
                          disabled={isMutating}
                        >
                          <Trash2 size={13} />
                        </button>
                      </Popconfirm>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="landing-history-list">
          {projects.map((project) => (
            <div key={project.id} className="landing-history-row-wrap">
              <button
                type="button"
                className="landing-history-row"
                disabled={isMock || showTrash}
                onClick={() => !isMock && !showTrash && openProject(project.id)}
              >
                <div
                  className={`landing-thumb landing-thumb-${project.thumb}`}
                  data-dur={project.duration}
                  style={{
                    backgroundImage: `url(${project.thumbnailUrl || defaultProjectThumb})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <Play size={15} fill="currentColor" />
                </div>
                <div className="landing-row-main">
                  <div className="landing-row-title">{project.title}</div>
                  <div className="landing-row-meta">
                    <span>
                      {project.updatedAt
                        ? getProjectMeta(project.status, project.progress, project.updatedAt, t)
                        : project.meta}
                    </span>
                  </div>
                </div>
                {!showTrash && (
                  <span className={`landing-row-status landing-row-status-${project.status}`}>
                    <span className="dot" />
                    {t(STATUS_LABELS[project.status])}
                  </span>
                )}
                {!showTrash && (
                  <span
                    className="landing-row-action"
                    aria-label={
                      project.status === 'failed'
                        ? t('libraryOpRetry')
                        : project.status === 'processing'
                          ? t('libraryOpViewProgress')
                          : t('libraryOpDownload')
                    }
                  >
                    {project.status === 'failed' ? (
                      <RotateCcw size={15} />
                    ) : project.status === 'processing' ? (
                      <Clock size={15} />
                    ) : (
                      <Download size={15} />
                    )}
                  </span>
                )}
              </button>

              {!isMock && (
                <div className="landing-row-ops">
                  {showTrash ? (
                    <>
                      <button
                        type="button"
                        className="landing-row-ops-btn"
                        title={t('libraryOpRestore')}
                        disabled={isMutating}
                        onClick={() => void restoreProject(project.id)}
                      >
                        <Undo2 size={14} />
                      </button>
                      <Popconfirm
                        title={t('libraryOpDeletePermanentlyConfirmTitle')}
                        description={t('libraryOpDeletePermanentlyConfirm', { title: project.title })}
                        okText={t('libraryOpDelete')}
                        cancelText={t('libraryOpCancel')}
                        okButtonProps={{ danger: true, loading: isMutating }}
                        disabled={isMutating}
                        onConfirm={() => permanentDelete(project.id)}
                      >
                        <button
                          type="button"
                          className="landing-row-ops-btn landing-row-ops-btn--danger"
                          title={t('libraryOpDeletePermanently')}
                          disabled={isMutating}
                        >
                          <Trash2 size={14} />
                        </button>
                      </Popconfirm>
                    </>
                  ) : (
                    <Popconfirm
                      title={t('libraryOpMoveToTrashConfirmTitle')}
                      description={t('libraryOpMoveToTrashConfirm', { title: project.title })}
                      okText={t('libraryOpMoveToTrash')}
                      cancelText={t('libraryOpCancel')}
                      okButtonProps={{ danger: true, loading: isMutating }}
                      disabled={isMutating}
                      onConfirm={() => moveToTrash(project.id)}
                    >
                      <button
                        type="button"
                        className="landing-row-ops-btn"
                        title={t('libraryOpMoveToTrash')}
                        disabled={isMutating}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 size={14} />
                      </button>
                    </Popconfirm>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
