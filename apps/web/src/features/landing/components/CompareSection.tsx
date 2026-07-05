import { Check, X } from 'lucide-react';
import { COMPARE_ROWS } from '@/features/landing/data/landingContent';
import { LandingSectionHead } from '@/features/landing/components/LandingSectionHead';
import { useTranslation } from '@/features/settings';

function CompareCell({ valueKey }: { valueKey: string }) {
  const { t } = useTranslation();
  if (valueKey === 'compYes') {
    return (
      <span className="landing-compare-yes">
        <Check size={15} />
      </span>
    );
  }
  if (valueKey === 'compNo') {
    return (
      <span className="landing-compare-no">
        <X size={15} />
      </span>
    );
  }
  if (valueKey === 'compNone') {
    return <span className="landing-compare-no">—</span>;
  }
  return <>{t(valueKey as any)}</>;
}

export function CompareSection() {
  const { t } = useTranslation();

  return (
    <section className="landing-section landing-compare-section">
      <LandingSectionHead
        eyebrow={t('compareEyebrow')}
        title={t('compareTitle')}
        description={t('compareDesc')}
      />

      <div className="landing-table-wrap">
        <table className="landing-compare">
          <thead>
            <tr>
              <th />
              <th>{t('planFreeName')}</th>
              <th className="col-pro">
                <span className="th-plan">{t('planProName')}</span>
                {t('pricingMostPopular')}
              </th>
              <th>{t('planStudioName')}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.featureKey}>
                <td>{t(row.featureKey as any)}</td>
                <td>
                  <CompareCell valueKey={row.freeKey} />
                </td>
                <td className="col-pro">
                  <CompareCell valueKey={row.proKey} />
                </td>
                <td>
                  <CompareCell valueKey={row.studioKey} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
