import { ABOUT_STATS } from '@/features/landing/data/landingContent';
import { useTranslation } from '@/features/settings';

export function AboutSection() {
  const { t } = useTranslation();

  return (
    <section className="landing-section landing-about-section">
      <div className="landing-about-grid">
        <div className="landing-about-copy">
          <span className="landing-section-eyebrow">{t('aboutEyebrow')}</span>
          <h2 className="landing-section-title font-display">
            {t('aboutTitle')}
          </h2>
          <p>{t('aboutDesc1')}</p>
          <p>{t('aboutDesc2')}</p>
        </div>
        <div className="landing-about-stats">
          {ABOUT_STATS.map((stat) => (
            <div key={stat.labelKey} className="landing-stat">
              <span className="landing-stat-num font-display">{stat.value}</span>
              <span className="landing-stat-label">{t(stat.labelKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="landing-footer">
      © {new Date().getFullYear()} Vokop. {t('aboutFooterText')}
    </footer>
  );
}
