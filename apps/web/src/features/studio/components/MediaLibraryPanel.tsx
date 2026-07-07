import { useCallback, useRef, useState, type DragEvent } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { human } from '@vokop/editor';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useTranslation } from '@/features/settings';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import { StudioIcon } from '@vokop/ui';
import {
  MEDIA_ASSET_DRAG_MIME,
  mediaAssetDragPayload,
  type MediaAsset,
} from '@/features/studio/lib/mediaLibrary';
import { mediaKindDragType } from '@/features/studio/lib/timelineDrop';

const ACCEPT =
  'video/*,audio/*,image/*,.mp4,.webm,.mov,.mp3,.wav,.png,.jpg,.jpeg,.webp,.gif';

function isFileDrag(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes('Files');
}

function MediaAssetCard({
  asset,
  onAdd,
  onRemove,
  onSetPrimary,
}: {
  asset: MediaAsset;
  onAdd: () => void;
  onRemove: () => void;
  onSetPrimary: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(
      MEDIA_ASSET_DRAG_MIME,
      mediaAssetDragPayload(asset.id, asset.kind),
    );
    e.dataTransfer.setData(mediaKindDragType(asset.kind), asset.kind);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onVideoEnter = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => undefined);
  };

  const onVideoLeave = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <article
      className={cn(
        'media-lib-card',
        asset.isPrimary && 'media-lib-card--primary',
      )}
      draggable
      onDragStart={onDragStart}
      title={`${asset.name} — drag to timeline`}
    >
      <div
        className="media-lib-card-thumb"
        onPointerEnter={asset.kind === 'video' ? onVideoEnter : undefined}
        onPointerLeave={asset.kind === 'video' ? onVideoLeave : undefined}
      >
        {asset.kind === 'video' ? (
          <video
            ref={videoRef}
            src={asset.url}
            muted
            loop
            playsInline
            preload="metadata"
            className="media-lib-thumb-media"
          />
        ) : asset.kind === 'image' ? (
          <img src={asset.url} alt="" className="media-lib-thumb-media" />
        ) : (
          <div className="media-lib-thumb-audio">
            <StudioIcon name="volume" size={28} />
          </div>
        )}

        <div className="media-lib-overlay">
          <span className="media-lib-kind">{asset.kind}</span>
          <div className="media-lib-card-actions">
            <button
              type="button"
              className="media-lib-action-btn media-lib-action-btn--add"
              title="Add to timeline"
              onClick={onAdd}
            >
              <StudioIcon name="add" size={14} />
            </button>
            {!asset.isPrimary && (
              <button
                type="button"
                className="media-lib-action-btn media-lib-action-btn--delete"
                title="Remove"
                onClick={onRemove}
              >
                <StudioIcon name="bin" size={14} />
              </button>
            )}
          </div>
        </div>

        {asset.isPrimary && <span className="media-lib-primary-badge">{t('mediaMainBadge')}</span>}
        {asset.kind !== 'image' && asset.duration > 0 && (
          <span className="media-lib-duration">{formatStudioTimecode(asset.duration)}</span>
        )}
      </div>

      <div className="media-lib-card-meta">
        <span className="media-lib-card-name" title={asset.name}>
          {asset.name}
        </span>
        <span className="media-lib-card-sub">
          {asset.width != null && asset.height != null && (
            <span>
              {asset.width}×{asset.height}
            </span>
          )}
          <span>{human.bytes(asset.size)}</span>
        </span>
        {asset.kind === 'video' && !asset.isPrimary && (
          <button type="button" className="media-lib-set-main" onClick={onSetPrimary}>
            {t('mediaSetMain')}
          </button>
        )}
      </div>
    </article>
  );
}

export function MediaLibraryPanel() {
  const { t } = useTranslation();
  const mediaAssets = useAppStore((s) => s.mediaAssets);
  const importMediaFiles = useAppStore((s) => s.importMediaFiles);
  const removeMediaAsset = useAppStore((s) => s.removeMediaAsset);
  const addMediaAssetToTimeline = useAppStore((s) => s.addMediaAssetToTimeline);
  const setPrimaryVideoAsset = useAppStore((s) => s.setPrimaryVideoAsset);
  const mediaStorageWarning = useAppStore((s) => s.mediaStorageWarning);
  const dismissMediaStorageWarning = useAppStore((s) => s.dismissMediaStorageWarning);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || (files instanceof FileList ? files.length === 0 : files.length === 0)) return;
      setImporting(true);
      try {
        await importMediaFiles(files);
      } finally {
        setImporting(false);
      }
    },
    [importMediaFiles],
  );

  const onDragOver = (e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave = (e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragActive(false);
  };

  const onDrop = (e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const empty = mediaAssets.length === 0 && !importing;

  return (
    <div
      className={cn('media-lib-panel', dragActive && 'media-lib-panel--drag')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <header className="media-lib-header">
        <p className="media-lib-count">
          {mediaAssets.length === 0
            ? t('mediaDropAnywhere')
            : `${mediaAssets.length} file${mediaAssets.length === 1 ? '' : 's'}`}
        </p>
      </header>

      {mediaStorageWarning && (
        <div className="media-lib-storage-warning" role="alert">
          <AlertTriangle size={13} aria-hidden />
          <span className="media-lib-storage-warning-text">{mediaStorageWarning}</span>
          <button
            type="button"
            className="media-lib-storage-warning-dismiss"
            aria-label="Dismiss storage warning"
            onClick={dismissMediaStorageWarning}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {empty ? (
        <button
          type="button"
          className="media-lib-empty"
          onClick={() => inputRef.current?.click()}
        >
          <StudioIcon name="import" size={36} className="media-lib-empty-icon" />
          <span className="media-lib-empty-title">{t('emptyMediaTitle')}</span>
          <span className="media-lib-empty-sub">
            {t('emptyMediaDesc')}
          </span>
        </button>
      ) : (
        <div className="media-lib-grid">
          {importing && (
            <div className="media-lib-card media-lib-card--placeholder" aria-hidden>
              <div className="media-lib-placeholder">
                <Loader2 size={22} className="animate-spin text-accent" />
              </div>
            </div>
          )}
          {mediaAssets.map((asset) => (
            <MediaAssetCard
              key={asset.id}
              asset={asset}
              onAdd={() => addMediaAssetToTimeline(asset.id)}
              onRemove={() => removeMediaAsset(asset.id)}
              onSetPrimary={() => setPrimaryVideoAsset(asset.id)}
            />
          ))}
        </div>
      )}

      <div className="media-lib-drag-message" aria-hidden={!dragActive}>
        <div className="media-lib-drag-content">
          <StudioIcon name="import" size={36} />
          <span>{t('mediaDropToImport')}</span>
        </div>
      </div>
    </div>
  );
}
