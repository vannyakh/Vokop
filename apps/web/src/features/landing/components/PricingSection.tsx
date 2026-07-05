import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { PRICING_PLANS } from '@/features/landing/data/landingContent';
import { LandingSectionHead } from '@/features/landing/components/LandingSectionHead';
import { useTranslation } from '@/features/settings';

interface PricingSectionProps {
  onHighlightPro: () => void;
}

export function PricingSection({ onHighlightPro }: PricingSectionProps) {
  const [annual, setAnnual] = useState(false);
  const { t } = useTranslation();

  return (
    <section className="landing-section landing-pricing-section">
      <LandingSectionHead
        eyebrow={t('pricingEyebrow')}
        title={t('pricingTitle')}
        description={t('pricingDesc')}
      />

      <div className="landing-pricing-controls">
        <div className={`landing-toggle-track${annual ? ' annual' : ''}`}>
          <div className="landing-toggle-pill" />
          <button
            type="button"
            className={!annual ? 'active' : ''}
            onClick={() => setAnnual(false)}
          >
            {t('pricingMonthly')}
          </button>
          <button
            type="button"
            className={annual ? 'active' : ''}
            onClick={() => setAnnual(true)}
          >
            {t('pricingAnnually')}
          </button>
          <span className="landing-save-badge">{t('pricingSave20')}</span>
        </div>
      </div>

      <div className={`landing-pricing-grid${annual ? ' annual' : ''}`}>
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            id={plan.id === 'pro' ? 'pro-card' : undefined}
            className={`landing-price-card${plan.featured ? ' featured' : ''}`}
          >
            {plan.featured && <span className="landing-popular-chip">{t('pricingMostPopular')}</span>}
            <div className="landing-plan-name">{t(plan.nameKey)}</div>
            <div className="landing-plan-desc">{t(plan.descKey)}</div>
            <div className="landing-plan-price">
              {plan.id === 'free' ? (
                <>
                  <span className="amount font-display">$0</span>
                  <span className="cycle">/ mo</span>
                </>
              ) : (
                <>
                  <span className="amount font-display price-monthly">{plan.monthlyPrice}</span>
                  <span className="amount font-display price-annual">{plan.annualPrice}</span>
                  <span className="cycle">/ mo</span>
                </>
              )}
            </div>
            <button type="button" className="landing-plan-cta">
              {t(plan.ctaKey)}
            </button>
            <ul className="landing-plan-features">
              {plan.features.map((f) => {
                const isWatermarkLink = 'link' in f && f.link;
                return (
                  <li key={f.textKey} className={f.included ? '' : 'muted'}>
                    {isWatermarkLink ? (
                      <button type="button" className="landing-feature-link" onClick={onHighlightPro}>
                        <X size={14} />
                        <span>
                          {t(f.textKey).split(' — ')[0]} —{' '}
                          <span className="link-hint">{t('planFreeWatermarkLink')}</span>
                        </span>
                      </button>
                    ) : (
                      <>
                        <Check size={14} />
                        {t(f.textKey)}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
