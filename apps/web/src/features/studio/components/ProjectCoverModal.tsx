import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  Check,
  Clock3,
  Film,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { VokopModal } from '@vokop/ui';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useVideoFilmstrip } from '@/features/studio/hooks/useVideoFilmstrip';
import { STUDIO_MODAL_STYLES } from '@/features/studio/lib/studioModalTheme';
import {
  COVER_UPLOAD_ACCEPT,
  COVER_UPLOAD_MAX_MB,
  captureVideoCoverDataUrl,
  coverUploadErrorMessage,
  processCoverUploadFile,
  type CoverUploadErrorCode,
  type ProjectCover,
} from '@/features/studio/lib/projectCover';

const FRAME_COUNT = 9;

type CoverTab = 'video' | 'upload';

interface ProjectCoverModalProps {
  open: boolean;
  onClose: () => void;
}

function formatCoverTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const cs = Math.floor((safe % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(cs).padStart(2, '0')}`;
}

function frameIndexFromTime(timeSec: number, duration: number): number {
  if (duration <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, timeSec / duration));
  return Math.round(ratio * (FRAME_COUNT - 1));
}

function timeFromFrameIndex(index: number, duration: number): number {
  if (FRAME_COUNT <= 1) return 0;
  const ratio = index / (FRAME_COUNT - 1);
  return ratio * duration;
}

function CoverSectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="cover-section-label">
      <Icon size={12} strokeWidth={2.2} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function ProjectCoverModal({ open, onClose }: ProjectCoverModalProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const videoFile = useAppStore((s) => s.videoFile);
  const mediaDuration = useAppStore((s) => s.mediaDuration);
  const duration = useAppStore((s) => s.duration);
  const videoSessionId = useAppStore((s) => s.videoSessionId);
  const projectThumbnailUrl = useAppStore((s) => s.projectThumbnailUrl);
  const projectCoverTimeSec = useAppStore((s) => s.projectCoverTimeSec);
  const projectCoverSource = useAppStore((s) => s.projectCoverSource);
  const setProjectCover = useAppStore((s) => s.setProjectCover);

  const [tab, setTab] = useState<CoverTab>('video');
  const [timeSec, setTimeSec] = useState(projectCoverTimeSec);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<CoverUploadErrorCode | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeDuration = Math.max(0.1, mediaDuration || duration || 1);
  const selectedFrame = frameIndexFromTime(timeSec, safeDuration);
  const busy = saving || uploading;

  const { thumbnails, loading: filmstripLoading } = useVideoFilmstrip(
    open && tab === 'video' ? videoFile : null,
    safeDuration,
    videoSessionId,
  );

  useEffect(() => {
    if (!open) return;
    const isUploadCover = projectCoverSource === 'upload' && projectThumbnailUrl;
    setTab(isUploadCover ? 'upload' : 'video');
    setTimeSec(projectCoverTimeSec);
    setVideoPreviewUrl(isUploadCover ? null : projectThumbnailUrl);
    setUploadPreviewUrl(isUploadCover ? projectThumbnailUrl : null);
    setUploadError(null);
    setDragOver(false);
    setUploading(false);
  }, [open, projectCoverSource, projectCoverTimeSec, projectThumbnailUrl]);

  const refreshVideoPreview = useCallback(
    async (nextTime: number) => {
      if (!videoUrl) return;
      const dataUrl = await captureVideoCoverDataUrl(videoUrl, nextTime);
      if (dataUrl) setVideoPreviewUrl(dataUrl);
    },
    [videoUrl],
  );

  useEffect(() => {
    if (!open || tab !== 'video' || !videoUrl) return;
    const handle = window.setTimeout(() => {
      void refreshVideoPreview(timeSec);
    }, 120);
    return () => window.clearTimeout(handle);
  }, [open, tab, timeSec, videoUrl, refreshVideoPreview]);

  const frameThumbs = useMemo(() => {
    if (!thumbnails.length) return Array.from({ length: FRAME_COUNT }, () => null as string | null);
    return Array.from({ length: FRAME_COUNT }, (_, i) => {
      const ratio = i / Math.max(1, FRAME_COUNT - 1);
      const idx = Math.min(
        thumbnails.length - 1,
        Math.max(0, Math.floor(ratio * thumbnails.length)),
      );
      return thumbnails[idx] ?? null;
    });
  }, [thumbnails]);

  const pickFrame = (index: number) => {
    setTimeSec(timeFromFrameIndex(index, safeDuration));
  };

  const processFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || busy) return;

    setUploading(true);
    setUploadError(null);
    setDragOver(false);

    const result = await processCoverUploadFile(file);
    setUploading(false);

    if (!result.ok) {
      setUploadError(result.error);
      return;
    }

    setUploadPreviewUrl(result.dataUrl);
    setTab('upload');
  };

  const clearUpload = () => {
    if (busy) return;
    setUploadPreviewUrl(null);
    setUploadError(null);
  };

  const openFilePicker = () => {
    if (busy) return;
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let cover: ProjectCover | null = null;
      if (tab === 'upload') {
        if (!uploadPreviewUrl) return;
        cover = { url: uploadPreviewUrl, source: 'upload' };
      } else if (videoUrl) {
        const dataUrl = (await captureVideoCoverDataUrl(videoUrl, timeSec)) ?? videoPreviewUrl;
        if (!dataUrl) return;
        cover = { url: dataUrl, source: 'video', timeSec };
      }
      if (cover) setProjectCover(cover);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    tab === 'upload' ? Boolean(uploadPreviewUrl) && !uploading : Boolean(videoUrl && videoPreviewUrl);

  const bindDropZone = (enabled: boolean) => ({
    onDragEnter: (e: DragEvent<HTMLElement>) => {
      if (!enabled || busy) return;
      e.preventDefault();
      setDragOver(true);
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!enabled || busy) return;
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!enabled) return;
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDragOver(false);
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (!enabled || busy) return;
      void processFiles(e.dataTransfer.files);
    },
  });

  return (
    <VokopModal
      open={open}
      width={420}
      draggable={!busy}
      destroyOnHidden
      mask={{ closable: !busy }}
      closable={!busy}
      className="studio-modal cover-modal"
      styles={STUDIO_MODAL_STYLES}
      onCancel={onClose}
      footer={null}
    >
      <div className="cover-modal-body">
        <header className="cover-modal-header vokop-modal-drag-handle">
          <div>
            <h2 className="cover-modal-title">Add cover</h2>
            <p className="cover-modal-subtitle">
              Pick a frame from the video, or upload your own image
            </p>
          </div>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept={COVER_UPLOAD_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            void processFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="cover-modal-tabs" role="tablist" aria-label="Cover source">
          {(
            [
              { key: 'video' as const, label: 'From video', icon: Film },
              { key: 'upload' as const, label: 'Upload', icon: Upload },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={busy}
                className={cn('cover-modal-tab', active && 'is-active')}
                onClick={() => setTab(key)}
              >
                <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <section className="cover-modal-section">
          <CoverSectionLabel icon={ImagePlus}>Preview</CoverSectionLabel>
          {uploadError && tab === 'upload' && (
            <p className="cover-upload-error" role="alert">
              {coverUploadErrorMessage(uploadError)}
            </p>
          )}
          {tab === 'video' ? (
            <div className="cover-preview">
              {videoPreviewUrl ? (
                <img src={videoPreviewUrl} alt="" className="cover-preview__img" draggable={false} />
              ) : (
                <div className="cover-preview__placeholder" aria-hidden />
              )}
              <span className="cover-preview__badge">Frame {selectedFrame + 1}</span>
            </div>
          ) : (
            <div
              className={cn(
                'cover-preview cover-preview--upload',
                !uploadPreviewUrl && 'is-empty',
                uploadPreviewUrl && 'has-upload',
                dragOver && 'is-drag-over',
                uploading && 'is-busy',
              )}
              {...bindDropZone(!busy)}
            >
              {uploadPreviewUrl ? (
                <>
                  <img src={uploadPreviewUrl} alt="" className="cover-preview__img" draggable={false} />
                  <div className="cover-preview__toolbar">
                    <button
                      type="button"
                      className="cover-preview__tool"
                      disabled={busy}
                      onClick={openFilePicker}
                    >
                      <RefreshCw size={12} aria-hidden="true" />
                      Replace
                    </button>
                    <button
                      type="button"
                      className="cover-preview__tool cover-preview__tool--danger"
                      disabled={busy}
                      onClick={clearUpload}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="cover-preview__drop"
                  disabled={busy}
                  onClick={openFilePicker}
                >
                  <Upload size={22} strokeWidth={1.6} aria-hidden="true" />
                  <span className="cover-preview__drop-title">
                    Drag an image here, or click to browse
                  </span>
                  <span className="cover-preview__drop-hint">
                    JPG, PNG, WebP, or GIF · up to {COVER_UPLOAD_MAX_MB}MB
                  </span>
                </button>
              )}
              {uploading && (
                <div className="cover-preview__loading" aria-live="polite">
                  <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                  <span>Processing image…</span>
                </div>
              )}
            </div>
          )}
        </section>

        {tab === 'video' && (
          <section className="cover-modal-section cover-modal-section--frame">
            <CoverSectionLabel icon={Film}>Frame</CoverSectionLabel>
            {!videoUrl ? (
              <p className="cover-empty-hint">Add video to the project to pick a frame.</p>
            ) : (
              <>
                <div
                  className={cn('cover-frame-grid', filmstripLoading && 'is-loading')}
                  role="listbox"
                  aria-label="Video frames"
                >
                  {frameThumbs.map((src, i) => {
                    const active = i === selectedFrame;
                    return (
                      <button
                        key={i}
                        type="button"
                        role="option"
                        aria-selected={active}
                        aria-label={`Select frame ${i + 1}`}
                        disabled={busy}
                        className={cn('cover-frame-cell', active && 'is-active')}
                        onClick={() => pickFrame(i)}
                      >
                        {src ? (
                          <img src={src} alt="" className="cover-frame-cell__img" draggable={false} />
                        ) : (
                          <span className="cover-frame-cell__placeholder" aria-hidden />
                        )}
                        {active && (
                          <span className="cover-frame-cell__check" aria-hidden="true">
                            <Check size={9} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="cover-frame-time">
                  <Clock3 size={12} strokeWidth={2} aria-hidden="true" />
                  <span className="font-mono">{formatCoverTime(timeSec)}</span>
                </p>
              </>
            )}
          </section>
        )}

        <footer className={cn('cover-modal-footer', tab === 'upload' && 'cover-modal-footer--upload')}>
          <button type="button" className="cover-cancel-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="cover-confirm-btn"
            disabled={!canSave || busy}
            onClick={() => void handleSave()}
          >
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {saving ? 'Saving…' : 'Edit cover'}
          </button>
        </footer>
      </div>
    </VokopModal>
  );
}
