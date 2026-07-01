import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { PRICING_PLANS } from '@/features/landing/data/landingContent';
import { LandingSectionHead } from '@/features/landing/components/LandingSectionHead';

interface PricingSectionProps {
  onHighlightPro: () => void;
}

export function PricingSection({ onHighlightPro }: PricingSectionProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="landing-section landing-pricing-section">
      <LandingSectionHead
        eyebrow="Plans"
        title="Room to grow with your channel"
        description="Start free, upgrade when the queue gets heavier. Every plan keeps your originals untouched."
      />

      <div className="landing-pricing-controls">
        <div className={`landing-toggle-track${annual ? ' annual' : ''}`}>
          <div className="landing-toggle-pill" />
          <button
            type="button"
            className={!annual ? 'active' : ''}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            className={annual ? 'active' : ''}
            onClick={() => setAnnual(true)}
          >
            Annually
          </button>
        </div>
        <span className="landing-save-badge">Save 20%</span>
      </div>

      <div className={`landing-pricing-grid${annual ? ' annual' : ''}`}>
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            id={plan.id === 'pro' ? 'pro-card' : undefined}
            className={`landing-price-card${plan.featured ? ' featured' : ''}`}
          >
            {plan.featured && <span className="landing-popular-chip">Most popular</span>}
            <div className="landing-plan-name">{plan.name}</div>
            <div className="landing-plan-desc">{plan.description}</div>
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
              {plan.cta}
            </button>
            <ul className="landing-plan-features">
              {plan.features.map((f) => (
                <li key={f.text} className={f.included ? '' : 'muted'}>
                  {f.link ? (
                    <button type="button" className="landing-feature-link" onClick={onHighlightPro}>
                      <X size={14} />
                      <span>
                        Carries a Vokop watermark —{' '}
                        <span className="link-hint">removed in Pro</span>
                      </span>
                    </button>
                  ) : (
                    <>
                      <Check size={14} />
                      {f.text}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
