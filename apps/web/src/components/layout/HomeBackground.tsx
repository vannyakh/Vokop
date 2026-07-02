import { cn } from '@/lib/cn';

interface HomeBackgroundProps {
  theme?: 'light' | 'dark';
}

export function HomeBackground({ theme: _theme = 'light' }: HomeBackgroundProps) {
  return (
    <div className="home-pattern" aria-hidden>
      <div className="home-pattern-grid" />
      <div className="home-pattern-glow" />
    </div>
  );
}
