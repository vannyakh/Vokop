import {
  ArrowRight,
  Languages,
  Mic,
  Music,
  Users,
  Video,
  LayoutGrid,
  FileText,
  Monitor,
  Code,
} from 'lucide-react';
import { FEATURE_EXTRAS, FEATURE_STEPS } from '@/features/landing/data/landingContent';
import { LandingSectionHead } from '@/features/landing/components/LandingSectionHead';
import { useTranslation } from '@/features/settings';

const STEP_ICONS = [Mic, Languages, Music];
const EXTRA_ICONS = [Users, Video, LayoutGrid, FileText, Monitor, Code];

interface FeaturesSectionProps {
  onScrollToUpload: () => void;
}

export function FeaturesSection({ onScrollToUpload }: FeaturesSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="landing-section landing-features-section">
      <LandingSectionHead
        eyebrow={t('featuresEyebrow')}
        title={t('featuresTitle')}
        description={t('featuresDesc')}
      />

      <div className="landing-feature-grid">
        {FEATURE_STEPS.map((feature, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <button
              key={feature.step}
              type="button"
              className={`landing-feature-card${feature.alt ? ' landing-feature-card-alt' : ''}`}
              onClick={onScrollToUpload}
            >
              <span className="landing-feature-go">
                <ArrowRight size={12} />
              </span>
              <span className="landing-feature-step">{feature.step}</span>
              <div className="landing-feature-icon">
                <Icon size={18} />
              </div>
              <h3>{t(feature.titleKey)}</h3>
              <p>{t(feature.descKey)}</p>
            </button>
          );
        })}
      </div>

      <div className="landing-feature-extra">
        {FEATURE_EXTRAS.map((item, i) => {
          const Icon = EXTRA_ICONS[i];
          return (
            <div
              key={item.labelKey}
              className={`landing-extra-item${item.gated ? ' landing-extra-item-gated' : ''}`}
            >
              <span className="landing-extra-ico">
                <Icon size={14} />
              </span>
              <span>{t(item.labelKey)}</span>
              {item.gated && <span className="landing-tier-badge">Pro</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
