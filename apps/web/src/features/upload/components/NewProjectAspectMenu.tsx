import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { Popover } from '@vokop/ui/antd';
import type { AspectRatioId } from '@/types';
import { useTranslation } from '@/features/settings';

interface NewProjectAspectMenuProps {
  open: boolean;
  creatingAspectRatio: AspectRatioId | null;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (aspectRatio: AspectRatioId) => void;
  children: ReactNode;
}

const ASPECT_OPTIONS: Array<{
  id: Extract<AspectRatioId, '16:9' | '9:16' | '1:1'>;
  hintKey: 'aspectRatio16x9Hint' | 'aspectRatio9x16Hint' | 'aspectRatio1x1Hint';
  shapeClass: string;
}> = [
  { id: '16:9', hintKey: 'aspectRatio16x9Hint', shapeClass: 'upload-project-aspect-shape--wide' },
  { id: '9:16', hintKey: 'aspectRatio9x16Hint', shapeClass: 'upload-project-aspect-shape--portrait' },
  { id: '1:1', hintKey: 'aspectRatio1x1Hint', shapeClass: 'upload-project-aspect-shape--square' },
];

function AspectMenuContent({
  creatingAspectRatio,
  error,
  onClose,
  onSelect,
}: {
  creatingAspectRatio: AspectRatioId | null;
  error?: string | null;
  onClose: () => void;
  onSelect: (aspectRatio: AspectRatioId) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="upload-project-aspect-menu">
      <div className="upload-project-aspect-menu-head">
        <div>
          <div className="upload-project-aspect-menu-title">
            <span className="upload-project-blank-icon" aria-hidden="true" />
            <span>{t('createBlankProjectTitle')}</span>
          </div>
          <p className="upload-project-aspect-menu-subtitle">{t('createBlankProjectSubtitle')}</p>
        </div>
      </div>

      <div className="upload-project-aspect-list">
        {ASPECT_OPTIONS.map((option) => {
          const creating = creatingAspectRatio === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className="upload-project-aspect-option"
              onClick={() => onSelect(option.id)}
              disabled={creatingAspectRatio != null}
            >
              <span
                className={`upload-project-aspect-shape ${option.shapeClass}`}
                aria-hidden="true"
              />
              <span className="upload-project-aspect-copy">
                <span className="upload-project-aspect-label">{option.id}</span>
                <span className="upload-project-aspect-hint">{t(option.hintKey)}</span>
              </span>
              <span className="upload-project-aspect-action">
                {creating ? <Loader2 size={13} className="animate-spin" /> : t('createProject')}
              </span>
            </button>
          );
        })}
      </div>

      {creatingAspectRatio ? (
        <div className="upload-project-aspect-status">
          <Loader2 size={14} className="animate-spin" />
          <span>{t('creatingProject')}</span>
        </div>
      ) : null}

      {error ? <div className="upload-project-aspect-error">{error}</div> : null}
    </div>
  );
}

export function NewProjectAspectMenu({
  open,
  creatingAspectRatio,
  error,
  onOpenChange,
  onSelect,
  children,
}: NewProjectAspectMenuProps) {
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (creatingAspectRatio != null && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
      trigger="click"
      placement="bottom"
      arrow={false}
      destroyOnHidden
      classNames={{ root: 'upload-project-aspect-popover' }}
      content={
        <AspectMenuContent
          creatingAspectRatio={creatingAspectRatio}
          error={error}
          onClose={() => onOpenChange(false)}
          onSelect={onSelect}
        />
      }
    >
      {children}
    </Popover>
  );
}
