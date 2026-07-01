import { useCallback, useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { DEMO_SLIDES } from '@/features/landing/data/landingContent';
import { LandingSectionHead } from '@/features/landing/components/LandingSectionHead';

const SLIDE_COUNT = DEMO_SLIDES.length;

export function DemoSection() {
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = useCallback((index: number) => {
    setActive(((index % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragX(e.clientX - dragStartX.current);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const threshold = width * 0.18;
    if (dragX > threshold) goTo(active - 1);
    else if (dragX < -threshold) goTo(active + 1);
    setDragX(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') goTo(active + 1);
    if (e.key === 'ArrowLeft') goTo(active - 1);
  };

  const half = width / 2;
  const dragDeg = width ? (dragX / width) * 90 : 0;
  const rotateY = -active * 90 + dragDeg;

  return (
    <section className="landing-section landing-demo-section">
      <LandingSectionHead
        eyebrow="See it in action"
        title="Hear the difference"
        description="The same 24-second clip, run through the pipeline in four languages. Swipe to compare."
      />

      <div className="landing-demo-shell">
        <div
          ref={containerRef}
          role="group"
          aria-roledescription="carousel"
          aria-label="Language sample comparison"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className={`landing-demo-stage${dragging ? ' is-dragging' : ''}`}
        >
          <div
            className={`landing-demo-cube${dragging || reduceMotion ? ' no-transition' : ''}`}
            style={{
              transform: half ? `translateZ(-${half}px) rotateY(${rotateY}deg)` : undefined,
            }}
          >
            {DEMO_SLIDES.map((slide, i) => (
              <div
                key={slide.code}
                className="landing-demo-face"
                style={{
                  transform: half ? `rotateY(${i * 90}deg) translateZ(${half}px)` : undefined,
                }}
                aria-hidden={i !== active}
              >
                <div className="landing-demo-visual" style={{ background: slide.tint }}>
                  <span className="landing-demo-lang-label">
                    <span className="dd" />
                    {slide.label}
                  </span>
                  <button
                    type="button"
                    className="landing-demo-play"
                    aria-label={`Play ${slide.label} sample`}
                  >
                    <Play size={22} fill="currentColor" className="ml-0.5" />
                  </button>
                  <span className="landing-demo-duration">00:24</span>
                </div>
                <div className="landing-demo-body">
                  <div className="landing-demo-progress">
                    <div
                      className="landing-demo-progress-fill"
                      style={{ width: `${slide.progress}%` }}
                    />
                  </div>
                  <p className="landing-demo-caption font-display">
                    <span className="landing-demo-caption-label">Caption</span>
                    {slide.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-demo-langs">
          {DEMO_SLIDES.map((slide, i) => (
            <button
              key={slide.code}
              type="button"
              className={`landing-dchip${active === i ? ' active' : ''}`}
              onClick={() => goTo(i)}
            >
              {slide.code}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
