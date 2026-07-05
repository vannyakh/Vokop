import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { AudioLines, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LaunchButton } from '@vokop/ui';
import type { AspectRatioId } from '@/types';
import { cn } from '@/lib/cn';
import { useVideoUpload } from '@/features/upload/hooks/useVideoUpload';
import { UploadHeroTabs, type UploadHeroMode } from '@/features/upload/components/UploadHeroTabs';
import { NewProjectAspectMenu } from '@/features/upload/components/NewProjectAspectMenu';
import { useAppStore } from '@/features/project';
import { useAuthStore } from '@/features/auth';
import { useSettingsStore, useTranslation } from '@/features/settings';
import { api, queryClient, queryKeys } from '@/lib/api';
import { ROUTES } from '@/routes/paths';
import { FloatGroup } from '@/components/layout/FloatGroup';
import hLogoDark from '@/assets/images/h-logo-dark.png';
import hLogoLight from '@/assets/images/h-logo-light.png';
import { HomeBackground } from '@/components/layout/HomeBackground';
import { UploadTopActions } from '@/features/upload/components/UploadTopActions';
import { LoginModal } from '@/features/auth/components/LoginModal';
import { LandingSections } from '@/features/landing';
import { WhatsNewFab } from '@/features/landing/components/WhatsNewFab';
import { WhatsNewModal } from '@/features/landing/components/WhatsNewModal';

export function UploadDropzone() {
  const { uploadVideo } = useVideoUpload();
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const resetProject = useAppStore((s) => s.resetProject);
  const hydrateProject = useAppStore((s) => s.hydrateProject);
  const { t } = useTranslation();
  const [loginOpen, setLoginOpen] = useState(false);
  const [heroMode, setHeroMode] = useState<UploadHeroMode>('video');
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [aspectMenuOpen, setAspectMenuOpen] = useState(false);
  const [creatingAspectRatio, setCreatingAspectRatio] = useState<AspectRatioId | null>(null);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const pendingBrowseRef = useRef(false);
  const pendingNewProjectRef = useRef(false);

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
    disabled: heroMode === 'audio',
  });

  const requestLogin = useCallback(() => {
    pendingBrowseRef.current = false;
    pendingNewProjectRef.current = false;
    pendingFileRef.current = null;
    setLoginOpen(true);
  }, []);

  const handleBrowse = useCallback(() => {
    if (heroMode === 'audio') return;
    if (isLoggedIn) {
      open();
      return;
    }
    pendingBrowseRef.current = true;
    pendingNewProjectRef.current = false;
    pendingFileRef.current = null;
    setLoginOpen(true);
  }, [isLoggedIn, open, heroMode]);

  const requestNewProjectLogin = useCallback(() => {
    setCreateProjectError(null);
    pendingNewProjectRef.current = true;
    pendingBrowseRef.current = false;
    pendingFileRef.current = null;
    setAspectMenuOpen(false);
    setLoginOpen(true);
  }, []);

  const handleAspectMenuOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (heroMode === 'audio') return;

      if (!isLoggedIn) {
        if (nextOpen) requestNewProjectLogin();
        return;
      }

      setAspectMenuOpen(nextOpen);
      if (!nextOpen) setCreateProjectError(null);
    },
    [heroMode, isLoggedIn, requestNewProjectLogin],
  );

  const handleCreateBlankProject = useCallback(
    async (aspectRatio: AspectRatioId) => {
      if (creatingAspectRatio) return;
      setCreatingAspectRatio(aspectRatio);
      setCreateProjectError(null);

      try {
        const response = await api.createProject({
          title: t('newProject'),
          aspectRatio,
          status: 'done',
          progress: 100,
          durationSec: 30,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
        queryClient.setQueryData(queryKeys.projects.detail(response.project.id), response.project);

        resetProject();
        hydrateProject({
          id: response.project.id,
          title: response.project.title,
          aspectRatio: response.project.aspectRatio,
          status: response.project.status,
          progress: response.project.progress,
          durationSec: response.project.durationSec,
        });
        setAspectMenuOpen(false);
        navigate(`${ROUTES.studio}/${response.project.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('createProjectFailed');
        const offline =
          /failed to fetch|network|econnrefused|proxy/i.test(message) ||
          message === 'Failed to create project';
        setCreateProjectError(offline ? t('createProjectFailed') : message);
      } finally {
        setCreatingAspectRatio(null);
      }
    },
    [creatingAspectRatio, hydrateProject, navigate, queryClient, resetProject, t],
  );

  useEffect(() => {
    if (heroMode === 'audio') {
      setAspectMenuOpen(false);
      setCreateProjectError(null);
    }
  }, [heroMode]);

  const handleLoginSuccess = useCallback(() => {
    const pendingFile = pendingFileRef.current;
    const wantsBrowse = pendingBrowseRef.current;
    const wantsNewProject = pendingNewProjectRef.current;
    pendingFileRef.current = null;
    pendingBrowseRef.current = false;
    pendingNewProjectRef.current = false;

    if (pendingFile) {
      uploadVideo(pendingFile);
    } else if (wantsBrowse) {
      open();
    } else if (wantsNewProject) {
      setAspectMenuOpen(true);
    }
  }, [uploadVideo, open]);

  const handleLoginClose = useCallback(() => {
    pendingFileRef.current = null;
    pendingBrowseRef.current = false;
    pendingNewProjectRef.current = false;
    setLoginOpen(false);
  }, []);

  const scrollToUpload = () => {
    document.getElementById('upload-dropzone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleToolSelect = useCallback(
    (toolId: string) => {
      if (toolId === 'video-studio') {
        setHeroMode('video');
        scrollToUpload();
        return;
      }

      if (
        toolId === 'text-to-speech' ||
        toolId === 'voice-changer' ||
        toolId === 'audio-text-to-speech' ||
        toolId === 'audio-voice-changer'
      ) {
        setHeroMode('audio');
      }
    },
    [],
  );

  const floatTheme = colorTheme === 'dark' ? 'dark' : 'light';
  const horizontalLogoSrc = colorTheme === 'light' ? hLogoLight : hLogoDark;
  const heroTitleKey = heroMode === 'video' ? 'heroVideoTitle' : 'heroAudioTitle';
  const heroSubtitleKey = heroMode === 'video' ? 'heroVideoSubtitle' : 'heroAudioSubtitle';

  return (
    <div className="landing-page relative min-h-screen overflow-x-hidden">
      <HomeBackground />

      <FloatGroup
        theme={floatTheme}
        className="pointer-events-auto fixed top-5 left-5 sm:left-8 z-40 h-12 pl-3 pr-4"
      >
        <img
          src={horizontalLogoSrc}
          alt="Vokop"
          width={2489}
          height={347}
          className="block h-6 w-auto max-w-[calc(100vw-8rem)] select-none"
          draggable={false}
        />
        {/* <div className="float-brand-text pr-1">
          <span className="float-brand-version font-mono">{formatAppVersion()}</span>
        </div> */}
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
            {!isLoggedIn && (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.4 }}
                className="inline-flex justify-center w-full"
              >
                <img
                  src={horizontalLogoSrc}
                  alt="Vokop"
                  width={2489}
                  height={347}
                  className="block h-auto w-full max-w-xl sm:max-w-2xl mx-auto select-none"
                  draggable={false}
                />
              </motion.div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={heroMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-3 sm:space-y-4 max-w-2xl mx-auto"
              >
                <h1 className="upload-hero-title text-2xl sm:text-3xl md:text-4xl tracking-tight leading-[1.12]">
                  {t(heroTitleKey)}
                </h1>
                <p className="upload-hero-subtitle text-base sm:text-lg md:text-xl leading-relaxed font-medium">
                  {t(heroSubtitleKey)}
                </p>
              </motion.div>
            </AnimatePresence>

            <UploadHeroTabs value={heroMode} onChange={setHeroMode} onToolSelect={handleToolSelect} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="space-y-4 sm:space-y-5"
          >
            {heroMode === 'video' ? (
              <div className="upload-new-project-wrap">
                <NewProjectAspectMenu
                  open={aspectMenuOpen}
                  creatingAspectRatio={creatingAspectRatio}
                  error={createProjectError}
                  onOpenChange={handleAspectMenuOpenChange}
                  onSelect={handleCreateBlankProject}
                >
                  <LaunchButton
                    size="xl"
                    active={aspectMenuOpen}
                    aria-expanded={aspectMenuOpen}
                    disabled={creatingAspectRatio != null}
                  >
                    {t('newProject')}
                  </LaunchButton>
                </NewProjectAspectMenu>
              </div>
            ) : null}

            {heroMode === 'video' ? (
              <div className="upload-create-divider" aria-hidden="true">
                <span className="upload-create-divider-line" />
                <span className="upload-create-divider-text">{t('orUploadVideo')}</span>
                <span className="upload-create-divider-line" />
              </div>
            ) : null}

            <div
              id="upload-dropzone"
              {...getRootProps({ onClick: handleBrowse })}
              className={cn(
                'home-dropzone relative w-full rounded-[36px] sm:rounded-[44px]',
                'flex flex-col items-center justify-center gap-8 sm:gap-10 group',
                heroMode === 'video' && 'cursor-pointer',
                heroMode === 'audio' && 'opacity-95',
                isDragActive && 'home-dropzone-active',
              )}
            >
              <input {...getInputProps()} />

              <svg
                className="home-dropzone-border"
                aria-hidden="true"
                focusable="false"
              >
                <rect className="home-dropzone-border-rect" />
              </svg>

              <div className="upload-dropzone-icon w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center transition-colors duration-200">
                {heroMode === 'video' ? (
                  <Upload size={40} strokeWidth={2} />
                ) : (
                  <AudioLines size={40} strokeWidth={2} />
                )}
              </div>

              <div className="text-center space-y-2 px-6">
                <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--text)' }}>
                  {heroMode === 'video' ? t('dropHere') : t('audioComingSoon')}
                </p>
                <p className="text-base sm:text-lg text-muted">
                  {heroMode === 'video' ? t('dropHint') : t('audioDropHint')}
                </p>
              </div>

              {heroMode === 'video' ? (
                <div className="upload-browse-pill px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {t('browseFiles')}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      </section>

      <LandingSections onScrollToUpload={scrollToUpload} onRequestLogin={requestLogin} />

      <WhatsNewFab onClick={() => setWhatsNewOpen(true)} />
      <WhatsNewModal
        open={whatsNewOpen}
        onClose={() => setWhatsNewOpen(false)}
        onTryNow={scrollToUpload}
      />

      <LoginModal
        open={loginOpen}
        onClose={handleLoginClose}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
