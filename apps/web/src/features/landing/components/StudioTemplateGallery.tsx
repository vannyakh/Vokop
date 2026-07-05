import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  STUDIO_TEMPLATE_CATEGORIES,
  STUDIO_TEMPLATES,
  type StudioTemplate,
} from '@vokop/shared';
import { useAppStore } from '@/features/project';
import { useAuthStore } from '@/features/auth';
import { api, queryClient, queryKeys } from '@/lib/api';
import { ROUTES } from '@/routes/paths';

interface StudioTemplateGalleryProps {
  onRequestLogin?: () => void;
}

function aspectLabel(ratio: StudioTemplate['aspectRatio']) {
  if (ratio === 'original') return 'Original';
  return ratio;
}

function TemplateCard({
  template,
  disabled,
  onUse,
}: {
  template: StudioTemplate;
  disabled: boolean;
  onUse: (templateId: string) => void;
}) {
  const portrait = template.aspectRatio === '9:16' || template.aspectRatio === '3:4';

  return (
    <button
      type="button"
      className="studio-template-card"
      disabled={disabled}
      onClick={() => onUse(template.id)}
    >
      <div
        className={cn(
          'studio-template-card-preview',
          portrait && 'studio-template-card-preview--portrait',
        )}
        aria-hidden
      >
        <span className="studio-template-card-ratio">{aspectLabel(template.aspectRatio)}</span>
        <span className="studio-template-card-duration">{template.durationSec}s</span>
      </div>
      <div className="studio-template-card-body">
        <h3 className="studio-template-card-title">{template.name}</h3>
        <p className="studio-template-card-desc">{template.description}</p>
      </div>
    </button>
  );
}

export function StudioTemplateGallery({ onRequestLogin }: StudioTemplateGalleryProps) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const resetProject = useAppStore((s) => s.resetProject);
  const hydrateProject = useAppStore((s) => s.hydrateProject);
  const applyStudioTemplate = useAppStore((s) => s.applyStudioTemplate);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered =
    activeCategory === 'all'
      ? STUDIO_TEMPLATES
      : STUDIO_TEMPLATES.filter((t) => t.categories.includes(activeCategory));

  const handleUseTemplate = useCallback(
    async (templateId: string) => {
      if (!isLoggedIn) {
        onRequestLogin?.();
        return;
      }
      const template = STUDIO_TEMPLATES.find((t) => t.id === templateId);
      if (!template || creatingId) return;

      setCreatingId(templateId);
      setError(null);

      try {
        const response = await api.createProject({
          title: template.name,
          aspectRatio: template.aspectRatio,
          status: 'done',
          progress: 100,
          durationSec: template.durationSec,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
        queryClient.setQueryData(queryKeys.projects.detail(response.project.id), response.project);

        resetProject();
        hydrateProject({
          id: response.project.id,
          title: response.project.title,
          aspectRatio: response.project.aspectRatio,
          status: response.project.status,
          progress: response.project.progress,
          durationSec: response.project.durationSec,
        });
        applyStudioTemplate(templateId);
        navigate(`${ROUTES.studio}/${response.project.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create project from template';
        setError(message);
      } finally {
        setCreatingId(null);
      }
    },
    [applyStudioTemplate, creatingId, hydrateProject, isLoggedIn, navigate, onRequestLogin, resetProject],
  );

  return (
    <section className="landing-section landing-templates-section">
      <div className="landing-section-head-row">
        <div>
          <span className="landing-section-eyebrow">Start faster</span>
          <h2 className="landing-section-title font-display">Templates</h2>
          <p className="landing-section-desc">
            Pick a layout, then drop in your footage. Text and timing are ready to edit.
          </p>
        </div>
      </div>

      <div className="studio-template-filters" role="tablist" aria-label="Template categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'all'}
          className={cn('studio-template-filter', activeCategory === 'all' && 'is-active')}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        {STUDIO_TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={cn('studio-template-filter', activeCategory === cat.id && 'is-active')}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && <p className="studio-template-error">{error}</p>}

      <div className="studio-template-grid">
        {filtered.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            disabled={creatingId != null}
            onUse={handleUseTemplate}
          />
        ))}
      </div>

      {creatingId && (
        <div className="studio-template-loading" aria-live="polite">
          <Loader2 className="animate-spin" size={16} />
          <span>Creating project…</span>
        </div>
      )}
    </section>
  );
}
