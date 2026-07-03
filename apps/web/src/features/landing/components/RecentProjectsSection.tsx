import {
  ArrowRight,
  Clock,
  Download,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useRecentProjects } from '@/features/projects/hooks/useRecentProjects';
import { useProjectNavigation } from '@/features/project/hooks/useProjectNavigation';

const STATUS_LABELS = {
  done: 'Completed',
  processing: 'Processing',
  failed: 'Failed',
} as const;

export function RecentProjectsSection() {
  const { projects, isMock, isLoading, isError } = useRecentProjects();
  const { openProject } = useProjectNavigation();

  return (
    <section className="landing-section landing-history-section">
      <div className="landing-section-head-row">
        <div>
          <span className="landing-section-eyebrow">Your library</span>
          <h2 className="landing-section-title font-display">Recent projects</h2>
        </div>
        <button type="button" className="landing-view-all" disabled={isMock}>
          View all
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="landing-history-list">
        {isLoading ? (
          <div className="landing-history-empty">
            <Loader2 size={18} className="animate-spin" />
            <span>Loading your projects…</span>
          </div>
        ) : isError ? (
          <div className="landing-history-empty">Could not load your projects.</div>
        ) : projects.length === 0 ? (
          <div className="landing-history-empty">
            No projects yet. Upload a video to start your first project.
          </div>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="landing-history-row"
              disabled={isMock}
              onClick={() => !isMock && openProject(project.id)}
            >
              <div className={`landing-thumb landing-thumb-${project.thumb}`} data-dur={project.duration}>
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
              <span className={`landing-row-status landing-row-status-${project.status}`}>
                <span className="dot" />
                {STATUS_LABELS[project.status]}
              </span>
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
            </button>
          ))
        )}
      </div>
    </section>
  );
}
