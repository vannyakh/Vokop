import { useCallback, useRef, useState, type DragEvent } from 'react';
import {
  Film,
  Image as ImageIcon,
  Music2,
  Plus,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import {
  MEDIA_ASSET_DRAG_MIME,
  mediaAssetDragPayload,
  type MediaAsset,
} from '@/features/studio/lib/mediaLibrary';
import { useTranscriptReady } from '@/features/studio/hooks/useTranscriptReady';

function AssetIcon({ kind }: { kind: MediaAsset['kind'] }) {
  if (kind === 'audio') return <Music2 size={18} />;
  if (kind === 'image') return <ImageIcon size={18} />;
  return <Film size={18} />;
}

function MediaAssetCard({
  asset,
  onAdd,
  onRemove,
  onSetPrimary,
  timelineReady,
}: {
  asset: MediaAsset;
  onAdd: () => void;
  onRemove: () => void;
  onSetPrimary: () => void;
  timelineReady: boolean;
}) {
  const onDragStart = (e: DragEvent) => {
    if (!timelineReady) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(MEDIA_ASSET_DRAG_MIME, mediaAssetDragPayload(asset.id));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className={cn(
        'media-lib-card',
        asset.isPrimary && 'media-lib-card--primary',
        !timelineReady && 'media-lib-card--locked',
      )}
      draggable={timelineReady}
      onDragStart={onDragStart}
      title={
        timelineReady
          ? `${asset.name} — drag to timeline`
          : `${asset.name} — run Process All to unlock timeline edit`
      }
    >
      <div className="media-lib-card-thumb">
        {asset.kind === 'image' || asset.kind === 'video' ? (
          asset.kind === 'video' ? (
            <video src={asset.url} muted preload="metadata" className="media-lib-thumb-media" />
          ) : (
            <img src={asset.url} alt="" className="media-lib-thumb-media" />
          )
        ) : (
          <div className="media-lib-thumb-audio">
            <AssetIcon kind={asset.kind} />
          </div>
        )}
        <span className="media-lib-kind">{asset.kind}</span>
        {asset.isPrimary && <span className="media-lib-primary-badge">Main</span>}
        <div className="media-lib-card-actions">
          <button
            type="button"
            className="media-lib-action-btn"
            title={timelineReady ? 'Add to timeline' : 'Unlocks after transcript'}
            disabled={!timelineReady}
            onClick={onAdd}
          >
            <Plus size={12} />
          </button>
          {!asset.isPrimary && (
            <button type="button" className="media-lib-action-btn" title="Remove" onClick={onRemove}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="media-lib-card-meta">
        <span className="media-lib-card-name" title={asset.name}>
          {asset.name}
        </span>
        <span className="media-lib-card-sub">
          {asset.kind !== 'image' && asset.duration > 0 && (
            <span>{formatStudioTimecode(asset.duration)}</span>
          )}
          {asset.width != null && asset.height != null && (
            <span>
              {asset.width}×{asset.height}
            </span>
          )}
          <span>{(asset.size / (1024 * 1024)).toFixed(1)} MB</span>
        </span>
        {asset.kind === 'video' && !asset.isPrimary && (
          <button type="button" className="media-lib-set-main" onClick={onSetPrimary}>
            Set as main video
          </button>
        )}
      </div>
    </div>
  );
}

export function MediaLibraryPanel() {
  const mediaAssets = useAppStore((s) => s.mediaAssets);
  const importMediaFiles = useAppStore((s) => s.importMediaFiles);
  const removeMediaAsset = useAppStore((s) => s.removeMediaAsset);
  const addMediaAssetToTimeline = useAppStore((s) => s.addMediaAssetToTimeline);
  const setPrimaryVideoAsset = useAppStore((s) => s.setPrimaryVideoAsset);
  const transcriptReady = useTranscriptReady();

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
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragActive(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <StudioPanel title="Project media" icon={<Film size={12} className="text-accent" />}>
      <div
        className={cn('media-lib-panel', dragActive && 'media-lib-panel--drag')}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*,image/*,.mp4,.webm,.mov,.mp3,.wav,.png,.jpg,.jpeg,.webp,.gif"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          className="media-lib-import-btn"
          disabled={importing}
          onClick={() => inputRef.current?.click()}
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {importing ? 'Importing…' : 'Import media'}
        </button>

        {mediaAssets.length === 0 ? (
          <div className="media-lib-empty">
            <Upload size={18} className="text-faint" />
            <p>No media yet. Import video, audio, or images.</p>
          </div>
        ) : (
          <div className="media-lib-grid">
            {mediaAssets.map((asset) => (
              <MediaAssetCard
                key={asset.id}
                asset={asset}
                timelineReady={transcriptReady}
                onAdd={() => addMediaAssetToTimeline(asset.id)}
                onRemove={() => removeMediaAsset(asset.id)}
                onSetPrimary={() => setPrimaryVideoAsset(asset.id)}
              />
            ))}
          </div>
        )}
      </div>
    </StudioPanel>
  );
}
