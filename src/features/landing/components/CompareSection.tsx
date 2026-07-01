import { Check, X } from 'lucide-react';
import { COMPARE_ROWS } from '@/features/landing/data/landingContent';
import { LandingSectionHead } from '@/features/landing/components/LandingSectionHead';

function CompareCell({ value }: { value: string }) {
  if (value === 'yes') {
    return (
      <span className="landing-compare-yes">
        <Check size={15} />
      </span>
    );
  }
  if (value === 'no') {
    return (
      <span className="landing-compare-no">
        <X size={15} />
      </span>
    );
  }
  if (value === '—') {
    return <span className="landing-compare-no">—</span>;
  }
  return <>{value}</>;
}

export function CompareSection() {
  return (
    <section className="landing-section landing-compare-section">
      <LandingSectionHead
        eyebrow="Side by side"
        title="Compare every plan in detail"
        description="Same three plans, broken down feature by feature — useful once you know roughly what you need."
      />

      <div className="landing-table-wrap">
        <table className="landing-compare">
          <thead>
            <tr>
              <th />
              <th>Free</th>
              <th className="col-pro">
                <span className="th-plan">Pro</span>
                Most popular
              </th>
              <th>Studio</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.feature}>
                <td>{row.feature}</td>
                <td>
                  <CompareCell value={row.free} />
                </td>
                <td className="col-pro">
                  <CompareCell value={row.pro} />
                </td>
                <td>
                  <CompareCell value={row.studio} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
