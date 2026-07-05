import { RecentProjectsSection } from '@/features/landing/components/RecentProjectsSection';
import { StudioTemplateGallery } from '@/features/landing/components/StudioTemplateGallery';
import { FeaturesSection } from '@/features/landing/components/FeaturesSection';
import { DemoSection } from '@/features/landing/components/DemoSection';
import { PricingSection } from '@/features/landing/components/PricingSection';
import { CompareSection } from '@/features/landing/components/CompareSection';
import { AboutSection, LandingFooter } from '@/features/landing/components/AboutSection';
import { OnlineToolsSection } from '@/features/landing/components/OnlineToolsSection';

interface LandingSectionsProps {
  onScrollToUpload: () => void;
  onRequestLogin?: () => void;
  onSelectTool?: (toolId: string) => void;
}

export function LandingSections({ onScrollToUpload, onRequestLogin, onSelectTool }: LandingSectionsProps) {
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
      <StudioTemplateGallery onRequestLogin={onRequestLogin} />
      {onSelectTool && <OnlineToolsSection onSelectTool={onSelectTool} />}
      <FeaturesSection onScrollToUpload={onScrollToUpload} />
      <DemoSection />
      <PricingSection onHighlightPro={highlightPro} />
      <CompareSection />
      <AboutSection />
      <LandingFooter />
    </div>
  );
}
