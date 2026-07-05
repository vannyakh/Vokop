import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { DEMO_SLIDES } from '@/features/landing/data/landingContent';
import { LandingSectionHead } from '@/features/landing/components/LandingSectionHead';
import { useTranslation } from '@/features/settings';

const SLIDE_COUNT = DEMO_SLIDES.length;

export function DemoSection() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});
  const [durations, setDurations] = useState<Record<number, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      // Pause all on unmount
      videoRefs.current.forEach((v) => {
        if (v) v.pause();
      });
    };
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

  const togglePlay = (index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;

    if (playingIndex === index) {
      video.pause();
      setPlayingIndex(null);
    } else {
      // Pause other videos
      videoRefs.current.forEach((v, i) => {
        if (v && i !== index) {
          v.pause();
          v.currentTime = 0;
        }
      });
      void video.play().catch(() => undefined);
      setPlayingIndex(index);
    }
  };

  const handleTimeUpdate = (index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;
    const progress = (video.currentTime / (video.duration || 1)) * 100;
    setProgressMap((prev) => ({ ...prev, [index]: progress }));
  };

  const handleLoadedMetadata = (index: number) => {
    const video = videoRefs.current[index];
    if (video) {
      setDurations((prev) => ({ ...prev, [index]: video.duration }));
    }
  };

  const handleVideoEnded = (index: number) => {
    setPlayingIndex(null);
    setProgressMap((prev) => ({ ...prev, [index]: 0 }));
    const video = videoRefs.current[index];
    if (video) video.currentTime = 0;
  };

  const goTo = useCallback((index: number) => {
    // Pause any playing video when shifting slides
    videoRefs.current.forEach((v) => {
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    });
    setPlayingIndex(null);
    setActive(((index % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag on gesture, not when clicking play/video controls
    const target = e.target as HTMLElement;
    if (target.closest('.landing-demo-play') || target.closest('video')) return;

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

  const formatTime = (time: number | undefined) => {
    if (time == null || isNaN(time)) return '00:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const half = width / 2;
  const dragDeg = width ? (dragX / width) * 90 : 0;
  const rotateY = -active * 90 + dragDeg;

  return (
    <section className="landing-section landing-demo-section">
      <LandingSectionHead
        eyebrow={t('demoEyebrow')}
        title={t('demoTitle')}
        description={t('demoDesc')}
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
            {DEMO_SLIDES.map((slide, i) => {
              const currentProgress = progressMap[i] ?? 0;
              const currentTime = videoRefs.current[i]?.currentTime ?? 0;
              const duration = durations[i] ?? 0;

              return (
                <div
                  key={slide.code}
                  className="landing-demo-face"
                  style={{
                    transform: half ? `rotateY(${i * 90}deg) translateZ(${half}px)` : undefined,
                  }}
                  aria-hidden={i !== active}
                >
                  <div
                    className="landing-demo-visual cursor-pointer relative overflow-hidden"
                    style={{ background: slide.tint }}
                    onClick={() => togglePlay(i)}
                  >
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      src={slide.video}
                      className="landing-demo-video"
                      playsInline
                      preload="metadata"
                      muted
                      loop
                      onTimeUpdate={() => handleTimeUpdate(i)}
                      onLoadedMetadata={() => handleLoadedMetadata(i)}
                      onEnded={() => handleVideoEnded(i)}
                    />

                    {/* Dark gradient overlay for captions/metadata readability */}
                    <div className="landing-demo-visual-overlay" />

                    <span className="landing-demo-lang-label z-20">
                      <span className="dd" />
                      {slide.label}
                    </span>

                    <button
                      type="button"
                      className={`landing-demo-play z-20 transition-transform duration-200 ${
                        playingIndex === i ? 'scale-90 opacity-0 hover:opacity-100 hover:scale-100' : 'scale-100'
                      }`}
                      aria-label={playingIndex === i ? 'Pause' : 'Play'}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay(i);
                      }}
                    >
                      {playingIndex === i ? (
                        <Pause size={22} fill="currentColor" />
                      ) : (
                        <Play size={22} fill="currentColor" className="ml-0.5" />
                      )}
                    </button>

                    <span className="landing-demo-duration z-20">
                      {duration > 0
                        ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                        : '00:24'}
                    </span>
                  </div>
                  <div className="landing-demo-body">
                    <div className="landing-demo-progress">
                      <div
                        className="landing-demo-progress-fill"
                        style={{ width: `${currentProgress || slide.progress}%` }}
                      />
                    </div>
                    <p className="landing-demo-caption font-display">
                      <span className="landing-demo-caption-label">{t('demoCaptionLabel')}</span>
                      {slide.caption}
                    </p>
                  </div>
                </div>
              );
            })}
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
