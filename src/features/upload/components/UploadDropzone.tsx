import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Languages, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { useVideoUpload } from '@/features/upload/hooks/useVideoUpload';
import { useAuthStore } from '@/features/auth';
import { useSettingsStore, useTranslation } from '@/features/settings';
import { BrandLogo, FloatGroup } from '@/components/layout/FloatGroup';
import { HomeBackground } from '@/components/layout/HomeBackground';
import { UploadTopActions } from '@/features/upload/components/UploadTopActions';
import { LoginModal } from '@/features/auth/components/LoginModal';
import { LandingSections } from '@/features/landing';

const FORMATS = ['MP4', 'MOV', 'WebM'];

export function UploadDropzone() {
  const { uploadVideo } = useVideoUpload();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const { t } = useTranslation();
  const [loginOpen, setLoginOpen] = useState(false);
  const pendingFileRef = useRef<File | null>(null);
  const pendingBrowseRef = useRef(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (!isLoggedIn) {
        pendingFileRef.current = file;
        pendingBrowseRef.current = false;
        setLoginOpen(true);
        return;
      }
      uploadVideo(file);
    },
    [uploadVideo, isLoggedIn],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'video/*': [] } as Record<string, string[]>,
    multiple: false,
    noClick: true,
  });

  const requestLogin = useCallback(() => {
    pendingBrowseRef.current = false;
    pendingFileRef.current = null;
    setLoginOpen(true);
  }, []);

  const handleBrowse = useCallback(() => {
    if (isLoggedIn) {
      open();
      return;
    }
    pendingBrowseRef.current = true;
    pendingFileRef.current = null;
    setLoginOpen(true);
  }, [isLoggedIn, open]);

  const handleLoginSuccess = useCallback(() => {
    const pendingFile = pendingFileRef.current;
    const wantsBrowse = pendingBrowseRef.current;
    pendingFileRef.current = null;
    pendingBrowseRef.current = false;

    if (pendingFile) {
      uploadVideo(pendingFile);
    } else if (wantsBrowse) {
      open();
    }
  }, [uploadVideo, open]);

  const handleLoginClose = useCallback(() => {
    pendingFileRef.current = null;
    pendingBrowseRef.current = false;
    setLoginOpen(false);
  }, []);

  const scrollToUpload = () => {
    document.getElementById('upload-dropzone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const floatTheme = colorTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className="landing-page relative min-h-screen overflow-x-hidden">
      <HomeBackground />

      <FloatGroup
        theme={floatTheme}
        className="pointer-events-auto fixed top-5 left-5 sm:left-8 z-40 pl-2 pr-4 py-1.5 gap-2.5"
      >
        <BrandLogo className="w-11 h-11" />
        <div className="text-left pr-1">
          <p className="text-base font-bold tracking-tight leading-none" style={{ color: 'var(--text)' }}>
            Vokop
          </p>
          <p className="text-xs mt-1 text-muted">{t('tagline')}</p>
        </div>
      </FloatGroup>

      <div className="fixed top-5 right-5 sm:right-8 z-40 pointer-events-auto">
        <UploadTopActions onLoginRequest={requestLogin} />
      </div>

      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 sm:px-8 py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-3xl space-y-8 sm:space-y-10"
        >
          <div className="text-center space-y-6 sm:space-y-8">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.4 }}
              className="inline-flex"
            >
              <div className="upload-hero-mark w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] sm:rounded-[32px] flex items-center justify-center rotate-3">
                <Languages size={52} strokeWidth={1.75} />
              </div>
            </motion.div>

            <div className="space-y-4 sm:space-y-5">
              <h1 className="upload-hero-title text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.08]">
                {t('title')}
              </h1>
              <p className="upload-hero-subtitle text-lg sm:text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto font-medium">
                {t('subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {FORMATS.map((fmt) => (
                <span key={fmt} className="upload-chip">
                  {fmt}
                </span>
              ))}
              <span className="upload-chip upload-chip-accent">
                <Sparkles size={14} />
                AI Powered
              </span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div
              id="upload-dropzone"
              {...getRootProps({ onClick: handleBrowse })}
              className={cn(
                'home-dropzone relative w-full rounded-[36px] sm:rounded-[44px]',
                'flex flex-col items-center justify-center gap-8 sm:gap-10 cursor-pointer group',
                'border-2 border-dashed transition-all duration-200',
                isDragActive && 'home-dropzone-active scale-[1.008]',
              )}
            >
              <input {...getInputProps()} />

              <div className="upload-dropzone-icon w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center transition-all duration-200 group-hover:scale-110">
                <Upload size={40} strokeWidth={2} />
              </div>

              <div className="text-center space-y-2 px-6">
                <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--text)' }}>
                  {t('dropHere')}
                </p>
                <p className="text-base sm:text-lg text-muted">{t('dropHint')}</p>
              </div>

              <div className="upload-browse-pill px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest font-mono opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
                Browse files
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <LandingSections onScrollToUpload={scrollToUpload} />

      <LoginModal
        open={loginOpen}
        onClose={handleLoginClose}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
