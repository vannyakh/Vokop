interface LandingSectionHeadProps {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}

export function LandingSectionHead({
  eyebrow,
  title,
  description,
  centered = true,
}: LandingSectionHeadProps) {
  return (
    <div className={centered ? 'landing-section-head landing-section-head-center' : 'landing-section-head'}>
      <span className="landing-section-eyebrow">{eyebrow}</span>
      <h2 className="landing-section-title font-display">{title}</h2>
      {description && <p className="landing-section-desc">{description}</p>}
    </div>
  );
}
