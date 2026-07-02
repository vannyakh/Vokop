import { useState } from 'react';
import { Download, X, Cpu, Film, Music2, Subtitles, Settings2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { createPortal } from 'react-dom';
import { detectBestVideoCodec, type ExportSettings, DEFAULT_EXPORT_SETTINGS } from '@/features/studio/lib/exportSettings';

interface ExportSettingsModalProps {
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  isExporting: boolean;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="export-setting-row">
      <span className="export-setting-label">{label}</span>
      <div className="export-setting-control">{children}</div>
    </div>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="export-chip-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn('export-chip', value === opt.value && 'active')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ExportSettingsModal({ onClose, onExport, isExporting }: ExportSettingsModalProps) {
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const codec = detectBestVideoCodec();
  const isHW = codec.includes('avc1') || codec.includes('mp4');

  const set = <K extends keyof ExportSettings>(key: K, val: ExportSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: val }));

  return createPortal(
    <div className="export-modal-backdrop" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-modal-header">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-accent" />
            <span className="export-modal-title">Export Settings</span>
          </div>
          <button type="button" className="export-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* GPU badge */}
        <div className="export-modal-body">
          <div className={cn('export-codec-badge', isHW ? 'export-codec-badge--hw' : 'export-codec-badge--sw')}>
            <Cpu size={12} />
            {isHW ? 'GPU-accelerated H.264 / MP4' : 'Software VP9 / WebM'}
            <span className="export-codec-detail">{codec || 'browser default'}</span>
          </div>

          {/* Video section */}
          <div className="export-section">
            <div className="export-section-head"><Film size={12} className="text-accent" /> Video</div>
            <Row label="Resolution">
              <ChipGroup
                options={[
                  { value: 'original', label: 'Original' },
                  { value: '1080p', label: '1080p' },
                  { value: '720p', label: '720p' },
                  { value: '480p', label: '480p' },
                ]}
                value={settings.resolution}
                onChange={(v) => set('resolution', v)}
              />
            </Row>
            <Row label="Quality">
              <ChipGroup
                options={[
                  { value: 'ultra', label: 'Ultra' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
                value={settings.quality}
                onChange={(v) => set('quality', v)}
              />
            </Row>
            <Row label="Frame rate">
              <div className="export-chip-group">
                {([24, 30, 60] as const).map((fps) => (
                  <button
                    key={fps}
                    type="button"
                    className={cn('export-chip', settings.fps === fps && 'active')}
                    onClick={() => set('fps', fps)}
                  >
                    {fps} fps
                  </button>
                ))}
              </div>
            </Row>
          </div>

          {/* Audio section */}
          <div className="export-section">
            <div className="export-section-head"><Music2 size={12} className="text-accent" /> Audio</div>
            <Row label="Original audio">
              <label className="export-toggle">
                <input
                  type="checkbox"
                  checked={settings.includeOriginalAudio}
                  onChange={(e) => set('includeOriginalAudio', e.target.checked)}
                  className="export-toggle-input"
                />
                <span className="export-toggle-track" />
              </label>
            </Row>
            <Row label="AI voiceover">
              <label className="export-toggle">
                <input
                  type="checkbox"
                  checked={settings.includeVoiceover}
                  onChange={(e) => set('includeVoiceover', e.target.checked)}
                  className="export-toggle-input"
                />
                <span className="export-toggle-track" />
              </label>
            </Row>
          </div>

          {/* Captions section */}
          <div className="export-section">
            <div className="export-section-head"><Subtitles size={12} className="text-accent" /> Captions</div>
            <Row label="Style">
              <ChipGroup
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'highlight', label: 'Highlight' },
                  { value: 'karaoke', label: 'Karaoke' },
                ]}
                value={settings.captionStyle}
                onChange={(v) => set('captionStyle', v)}
              />
            </Row>
            {settings.captionStyle !== 'none' && (
              <Row label="Size">
                <div className="export-scale-row">
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.1}
                    value={settings.captionScale}
                    onChange={(e) => set('captionScale', parseFloat(e.target.value))}
                    className="export-scale-slider"
                  />
                  <span className="export-scale-label">{Math.round(settings.captionScale * 100)}%</span>
                </div>
              </Row>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="export-modal-footer">
          <button type="button" className="export-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="export-confirm-btn"
            disabled={isExporting}
            onClick={() => onExport(settings)}
          >
            <Download size={14} />
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
