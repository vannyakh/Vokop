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
import { cn } from '@/lib/cn';

const STATUS_LABELS = {
  done: 'Completed',
  processing: 'Processing',
  failed: 'Failed',
} as const;

export function RecentProjectsSection() {
  const [showTrash, setShowTrash] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row');
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
          <span className="landing-section-eyebrow">Your library</span>
          <h2 className="landing-section-title font-display">
            {showTrash ? 'Trash' : 'Recent projects'}
          </h2>
        </div>
        <div className="landing-history-actions">
          <div className="landing-view-toggle">
            <button
              type="button"
              className={cn("landing-view-toggle-btn", viewMode === 'row' && "is-active")}
              onClick={() => setViewMode('row')}
              title="Row list view"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              className={cn("landing-view-toggle-btn", viewMode === 'grid' && "is-active")}
              onClick={() => setViewMode('grid')}
              title="Grid card view"
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
              {showTrash ? 'Back to projects' : `Trash${trashCount > 0 ? ` (${trashCount})` : ''}`}
            </button>
          )}
          {showTrash && !isMock && projects.length > 0 && (
            <Popconfirm
              title="Empty trash?"
              description="All projects in trash will be permanently deleted. This cannot be undone."
              okText="Empty trash"
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: isMutating }}
              disabled={isMutating}
              onConfirm={() => emptyTrash()}
            >
              <button
                type="button"
                className="landing-view-all landing-view-all--danger"
                disabled={isMutating}
              >
                Empty trash
              </button>
            </Popconfirm>
          )}
          {!showTrash && (
            <button type="button" className="landing-view-all" disabled={isMock}>
              View all
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="landing-history-list">
          <div className="landing-history-empty">
            <Loader2 size={18} className="animate-spin" />
            <span>{showTrash ? 'Loading trash…' : 'Loading your projects…'}</span>
          </div>
        </div>
      ) : isError ? (
        <div className="landing-history-list">
          <div className="landing-history-empty">
            {showTrash ? 'Could not load trash.' : 'Could not load your projects.'}
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="landing-history-list">
          <div className="landing-history-empty">
            {showTrash
              ? 'Trash is empty.'
              : 'No projects yet. Upload a video to start your first project.'}
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
                >
                  <Play size={18} fill="currentColor" />
                </div>
              </button>

              <div className="landing-grid-card-details">
                <div className="landing-grid-card-title">{project.title}</div>
                <div className="landing-grid-card-meta">
                  <span className="landing-row-lang">{project.lang}</span>
                  <span className="landing-row-sep">·</span>
                  <span>{project.meta}</span>
                </div>
              </div>

              <div className="landing-grid-card-footer">
                {!showTrash ? (
                  <span className={`landing-row-status landing-row-status-${project.status}`}>
                    <span className="dot" />
                    {STATUS_LABELS[project.status]}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">In Trash</span>
                )}

                <div className="landing-row-ops">
                  {showTrash ? (
                    <>
                      <button
                        type="button"
                        className="landing-row-ops-btn"
                        title="Restore"
                        disabled={isMutating}
                        onClick={() => void restoreProject(project.id)}
                      >
                        <Undo2 size={13} />
                      </button>
                      <Popconfirm
                        title="Delete permanently?"
                        description={`“${project.title}” will be permanently deleted.`}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, loading: isMutating }}
                        disabled={isMutating}
                        onConfirm={() => permanentDelete(project.id)}
                      >
                        <button
                          type="button"
                          className="landing-row-ops-btn landing-row-ops-btn--danger"
                          title="Delete permanently"
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
                            ? 'Retry'
                            : project.status === 'processing'
                              ? 'View progress'
                              : 'Download'
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
                        title="Move to trash?"
                        description={`“${project.title}” will be moved to trash.`}
                        okText="Move to trash"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, loading: isMutating }}
                        disabled={isMutating}
                        onConfirm={() => moveToTrash(project.id)}
                      >
                        <button
                          type="button"
                          className="landing-row-ops-btn"
                          title="Move to trash"
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
                >
                  <Play size={15} fill="currentColor" />
                </div>
                <div className="landing-row-main">
                  <div className="landing-row-title">{project.title}</div>
                  <div className="landing-row-meta">
                    <span className="landing-row-lang">{project.lang}</span>
                    <span className="landing-row-sep">·</span>
                    <span>{project.meta}</span>
                  </div>
                </div>
                {!showTrash && (
                  <span className={`landing-row-status landing-row-status-${project.status}`}>
                    <span className="dot" />
                    {STATUS_LABELS[project.status]}
                  </span>
                )}
                {!showTrash && (
                  <span
                    className="landing-row-action"
                    aria-label={
                      project.status === 'failed'
                        ? 'Retry'
                        : project.status === 'processing'
                          ? 'View progress'
                          : 'Download'
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
                        title="Restore"
                        disabled={isMutating}
                        onClick={() => void restoreProject(project.id)}
                      >
                        <Undo2 size={14} />
                      </button>
                      <Popconfirm
                        title="Delete permanently?"
                        description={`“${project.title}” will be permanently deleted. This cannot be undone.`}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, loading: isMutating }}
                        disabled={isMutating}
                        onConfirm={() => permanentDelete(project.id)}
                      >
                        <button
                          type="button"
                          className="landing-row-ops-btn landing-row-ops-btn--danger"
                          title="Delete permanently"
                          disabled={isMutating}
                        >
                          <Trash2 size={14} />
                        </button>
                      </Popconfirm>
                    </>
                  ) : (
                    <Popconfirm
                      title="Move to trash?"
                      description={`“${project.title}” will be moved to trash. You can restore it later.`}
                      okText="Move to trash"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true, loading: isMutating }}
                      disabled={isMutating}
                      onConfirm={() => moveToTrash(project.id)}
                    >
                      <button
                        type="button"
                        className="landing-row-ops-btn"
                        title="Move to trash"
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
