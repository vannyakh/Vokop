import {
  ArrowRight,
  Clock,
  Download,
  Play,
  RotateCcw,
} from 'lucide-react';
import { RECENT_PROJECTS } from '@/features/landing/data/landingContent';

const STATUS_LABELS = {
  done: 'Completed',
  processing: 'Processing',
  failed: 'Failed',
} as const;

export function RecentProjectsSection() {
  return (
    <section className="landing-section landing-history-section">
      <div className="landing-section-head-row">
        <div>
          <span className="landing-section-eyebrow">Your library</span>
          <h2 className="landing-section-title font-display">Recent projects</h2>
        </div>
        <button type="button" className="landing-view-all">
          View all
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="landing-history-list">
        {RECENT_PROJECTS.map((project) => (
          <div key={project.id} className="landing-history-row">
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
            <button
              type="button"
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
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
