import { RecentProjectsSection } from '@/features/landing/components/RecentProjectsSection';
import { FeaturesSection } from '@/features/landing/components/FeaturesSection';
import { DemoSection } from '@/features/landing/components/DemoSection';
import { PricingSection } from '@/features/landing/components/PricingSection';
import { CompareSection } from '@/features/landing/components/CompareSection';
import { AboutSection, LandingFooter } from '@/features/landing/components/AboutSection';

interface LandingSectionsProps {
  onScrollToUpload: () => void;
}

export function LandingSections({ onScrollToUpload }: LandingSectionsProps) {
  const highlightPro = () => {
    const el = document.getElementById('pro-card');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    window.setTimeout(() => el.classList.remove('flash'), 1000);
  };

  return (
    <div className="landing-sections relative z-10">
      <RecentProjectsSection />
      <FeaturesSection onScrollToUpload={onScrollToUpload} />
      <DemoSection />
      <PricingSection onHighlightPro={highlightPro} />
      <CompareSection />
      <AboutSection />
      <LandingFooter />
    </div>
  );
}
