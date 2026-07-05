import { useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from '@/features/settings';
import {
  WHATS_NEW_SECTIONS,
  type WhatsNewSectionId,
} from '@/features/landing/data/whatsNewContent';

interface WhatsNewModalProps {
  open: boolean;
  onClose: () => void;
  onTryNow?: () => void;
}

function WhatsNewPreview({
  section,
  modalOpen,
}: {
  section: (typeof WHATS_NEW_SECTIONS)[number];
  modalOpen: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
  }, [section.id]);

  useEffect(() => {
    if (modalOpen) return;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
  }, [modalOpen]);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.play();
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  return (
    <div
      className={`whats-new-preview whats-new-preview--${section.preview}${
        playing ? ' whats-new-preview--playing' : ''
      }`}
    >
      {section.videoUrl ? (
        <>
          <video
            ref={videoRef}
            className="whats-new-video"
            src={section.videoUrl}
            playsInline
            preload="metadata"
            muted
            loop
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onClick={togglePlayback}
          />
          {!playing && (
            <button
              type="button"
              className="whats-new-play"
              onClick={handlePlay}
              aria-label="Play video"
            >
              <Play size={18} fill="currentColor" />
            </button>
          )}
        </>
      ) : (
        <span className="whats-new-play" aria-hidden="true">
          <Play size={18} fill="currentColor" />
        </span>
      )}
    </div>
  );
}

export function WhatsNewModal({ open, onClose, onTryNow }: WhatsNewModalProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<WhatsNewSectionId>('video-studio');

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const active = WHATS_NEW_SECTIONS.find((section) => section.id === activeId) ?? WHATS_NEW_SECTIONS[0];

  return (
    <AnimatePresence>
      {open && (
        <div className="whats-new-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="whats-new-backdrop absolute inset-0"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="whats-new-panel relative w-full max-w-[920px] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="whats-new-title"
          >
            <div className="whats-new-header">
              <h2 id="whats-new-title" className="whats-new-title">
                {t('whatsNewTitle')}
              </h2>
              <button type="button" onClick={onClose} className="whats-new-close" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="whats-new-body">
              <nav className="whats-new-nav" aria-label={t('whatsNewTitle')}>
                {WHATS_NEW_SECTIONS.map((section) => {
                  const selected = section.id === activeId;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`whats-new-nav-item${selected ? ' whats-new-nav-item--active' : ''}`}
                      onClick={() => setActiveId(section.id)}
                    >
                      {t(section.navKey)}
                    </button>
                  );
                })}
              </nav>

              <div className="whats-new-content">
                <WhatsNewPreview section={active} modalOpen={open} />

                <h3 className="whats-new-item-title">{t(active.titleKey)}</h3>
                <p className="whats-new-item-body">{t(active.bodyKey)}</p>

                <button
                  type="button"
                  className="whats-new-cta"
                  onClick={() => {
                    onTryNow?.();
                    onClose();
                  }}
                >
                  {t('whatsNewTryNow')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
