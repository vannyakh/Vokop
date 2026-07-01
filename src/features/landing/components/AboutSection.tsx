import { ABOUT_STATS } from '@/features/landing/data/landingContent';

export function AboutSection() {
  return (
    <section className="landing-section landing-about-section">
      <div className="landing-about-grid">
        <div className="landing-about-copy">
          <span className="landing-section-eyebrow">About Vokop</span>
          <h2 className="landing-section-title font-display">
            Built for creators who don&apos;t stop at one language
          </h2>
          <p>
            Vokop started as an internal tool for dubbing short-form product videos into Khmer,
            Thai, and Japanese without hiring a full studio for every clip. It grew from there.
          </p>
          <p>
            The pipeline is the same one creators use today — transcribe, translate, voice over —
            just faster, and tuned for the languages South East Asian teams actually ship in.
          </p>
        </div>
        <div className="landing-about-stats">
          {ABOUT_STATS.map((stat) => (
            <div key={stat.label} className="landing-stat">
              <span className="landing-stat-num font-display">{stat.value}</span>
              <span className="landing-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      © {new Date().getFullYear()} Vokop. Built for creators who don&apos;t stop at one language.
    </footer>
  );
}
