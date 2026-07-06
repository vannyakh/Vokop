import { useEffect, useMemo, useState } from 'react';
import { Loader2, Music2, Scissors, Video } from 'lucide-react';
import { InputNumber, Select, Switch } from '@vokop/ui/antd';
import { VokopModal } from '@vokop/ui';
import { useAppStore } from '@/features/project';
import { useTranslation } from '@/features/settings';
import {
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_AUDIO_FORMATS,
  EXPORT_FORMAT_CODECS,
  type ExportCodec,
  type ExportFormat,
  type ExportQuality,
  type ExportSettings,
  type ExportType,
} from '@/features/studio/lib/exportSettings';
import { STUDIO_MODAL_STYLES } from '@/features/studio/lib/studioModalTheme';

interface ExportVideoModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  isExporting: boolean;
}

function formatTimecode(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hh = Math.floor(clamped / 3600);
  const mm = Math.floor((clamped % 3600) / 60);
  const ss = Math.floor(clamped % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:00`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const mm = Math.floor(seconds / 60);
    const ss = Math.round(seconds % 60);
    return `${mm}m ${ss}s`;
  }
  return `${Math.round(seconds * 10) / 10}s`;
}

const VIDEO_FORMATS: ExportFormat[] = ['mp4', 'webm'];
const CODEC_LABEL: Record<ExportCodec, string> = { h264: 'H.264', h265: 'H.265 (HEVC)', vp9: 'VP9' };

const EXPORT_SELECT_POPUP = {
  classNames: { popup: { root: 'export-select-dropdown' } },
  styles: { popup: { root: { backgroundColor: '#141414' } } },
} as const;

export function ExportVideoModal({ open, onClose, onExport, isExporting }: ExportVideoModalProps) {
  const { t } = useTranslation();
  const timelineDuration = useAppStore((s) => s.duration);
  const exportProgress = useAppStore((s) => s.exportProgress);
  const fallbackDuration = timelineDuration > 0 ? timelineDuration : 3;

  const [settings, setSettings] = useState<ExportSettings>(() => ({
    ...DEFAULT_EXPORT_SETTINGS,
    rangeInSec: 0,
    rangeOutSec: fallbackDuration,
  }));

  useEffect(() => {
    if (!open) return;
    setSettings({
      ...DEFAULT_EXPORT_SETTINGS,
      rangeInSec: 0,
      rangeOutSec: fallbackDuration,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const rangeDuration = Math.max(0, settings.rangeOutSec - settings.rangeInSec);

  const setExportType = (exportType: ExportType) => {
    setSettings((s) => ({
      ...s,
      exportType,
      format: exportType === 'audio' ? 'mp3' : 'mp4',
      codec: 'h264',
    }));
  };

  const setFormat = (format: ExportFormat) => {
    setSettings((s) => {
      const codecs = EXPORT_FORMAT_CODECS[format as 'mp4' | 'webm'];
      return { ...s, format, codec: codecs ? codecs[0]! : s.codec };
    });
  };

  const availableCodecs = useMemo(
    () => (settings.format === 'mp4' || settings.format === 'webm' ? EXPORT_FORMAT_CODECS[settings.format] : []),
    [settings.format],
  );

  const formatHint =
    settings.format === 'mp4'
      ? t('exportFormatMp4Hint')
      : settings.format === 'webm'
        ? t('exportFormatWebmHint')
        : undefined;

  const exportTypeOptions = useMemo(
    () => [
      { value: 'video' as const, label: t('exportTypeVideo') },
      { value: 'audio' as const, label: t('exportTypeAudio') },
    ],
    [t],
  );

  const formatOptions = (settings.exportType === 'video' ? VIDEO_FORMATS : EXPORT_AUDIO_FORMATS).map((fmt) => ({
    value: fmt,
    label: fmt.toUpperCase(),
  }));

  const codecOptions = availableCodecs.map((codec) => ({ value: codec, label: CODEC_LABEL[codec] }));

  const qualityOptions = [
    { value: 'ultra', label: t('exportQualityUltra') },
    { value: 'high', label: t('exportQualityHigh') },
    { value: 'medium', label: t('exportQualityMedium') },
    { value: 'low', label: t('exportQualityLow') },
  ];

  return (
    <VokopModal
      open={open}
      width={500}
      draggable={!isExporting}
      destroyOnHidden
      mask={{ closable: !isExporting }}
      closable={!isExporting}
      className="studio-modal export-modal"
      styles={STUDIO_MODAL_STYLES}
      onCancel={onClose}
      footer={null}
    >
      <div className="export-modal-body">
        <header className="studio-modal-head vokop-modal-drag-handle">
          <h2 className="studio-modal-head__title">{t('exportVideoTitle')}</h2>
          <p className="studio-modal-head__subtitle">{t('exportVideoSubtitle')}</p>
        </header>

        {isExporting && (
          <div className="export-progress" role="status" aria-live="polite">
            <div className="export-progress__row">
              <span className="export-progress__label">
                {exportProgress > 0 ? t('exportRenderingStatus') : t('exportPreparingStatus')}
              </span>
              <span className="export-progress__pct">{Math.round(exportProgress)}%</span>
            </div>
            <div className="export-progress__track" aria-hidden>
              <div className="export-progress__bar" style={{ width: `${exportProgress}%` }} />
            </div>
          </div>
        )}

        <section className="export-panel export-panel--row">
          <div className="export-row">
            <span className="export-row__label">{t('exportType')}</span>
            <Select
              className="export-inline-select"
              size="small"
              variant="borderless"
              {...EXPORT_SELECT_POPUP}
              value={settings.exportType}
              disabled={isExporting}
              onChange={(value) => setExportType(value as ExportType)}
              options={exportTypeOptions}
              popupMatchSelectWidth={false}
            />
          </div>
        </section>

        <section className="export-panel">
          <header className="export-panel__head">
            <Scissors size={13} aria-hidden="true" />
            <span>{t('exportRange')}</span>
          </header>
          <div className="export-range-grid">
            <label className="export-range-field">
              <span className="export-range-label">{t('exportRangeIn')}</span>
              <InputNumber
                className="export-range-input"
                min={0}
                max={settings.rangeOutSec}
                step={0.1}
                precision={2}
                value={settings.rangeInSec}
                disabled={isExporting}
                controls
                onChange={(value) => set('rangeInSec', Math.max(0, value ?? 0))}
              />
              <span className="export-range-timecode">{formatTimecode(settings.rangeInSec)}</span>
            </label>
            <label className="export-range-field">
              <span className="export-range-label">{t('exportRangeOut')}</span>
              <InputNumber
                className="export-range-input"
                min={settings.rangeInSec}
                max={fallbackDuration}
                step={0.1}
                precision={2}
                value={settings.rangeOutSec}
                disabled={isExporting}
                controls
                onChange={(value) =>
                  set('rangeOutSec', Math.max(settings.rangeInSec + 0.1, value ?? 0))
                }
              />
              <span className="export-range-timecode">{formatTimecode(settings.rangeOutSec)}</span>
            </label>
            <div className="export-range-field export-range-field--duration">
              <span className="export-range-label">{t('exportRangeDuration')}</span>
              <div className="export-range-duration">{formatDuration(rangeDuration)}</div>
            </div>
          </div>
        </section>

        <section className="export-panel">
          <header className="export-panel__head">
            {settings.exportType === 'video' ? (
              <Video size={13} aria-hidden="true" />
            ) : (
              <Music2 size={13} aria-hidden="true" />
            )}
            <span>{t('exportFormat')}</span>
          </header>
          <div
            className={`export-config-grid${settings.exportType === 'video' ? ' export-config-grid--video' : ''}`}
          >
            <div className="export-config-item">
              <span className="export-setting-label">{t('exportFormat')}</span>
              <Select
                className="export-select"
                {...EXPORT_SELECT_POPUP}
                value={settings.format}
                disabled={isExporting}
                onChange={(value) => setFormat(value as ExportFormat)}
                options={formatOptions}
                popupMatchSelectWidth
              />
              {formatHint ? <span className="export-field-hint">{formatHint}</span> : null}
            </div>

            {settings.exportType === 'video' ? (
              <div className="export-config-item">
                <span className="export-setting-label">{t('exportCodec')}</span>
                <Select
                  className="export-select"
                  {...EXPORT_SELECT_POPUP}
                  value={settings.codec}
                  disabled={isExporting}
                  onChange={(value) => set('codec', value as ExportCodec)}
                  options={codecOptions}
                  popupMatchSelectWidth
                />
              </div>
            ) : null}

            <div className="export-config-item">
              <span className="export-setting-label">{t('exportQuality')}</span>
              <Select
                className="export-select"
                {...EXPORT_SELECT_POPUP}
                value={settings.quality}
                disabled={isExporting}
                onChange={(value) => set('quality', value as ExportQuality)}
                options={qualityOptions}
                popupMatchSelectWidth
              />
            </div>
          </div>
        </section>

        {settings.exportType === 'video' ? (
          <section className="export-panel export-panel--row">
            <div className="export-field-row export-field-row--switch">
              <div className="export-field-row__text">
                <div className="export-watermark-title">{t('exportRemoveWatermark')}</div>
                <div className="export-watermark-hint">{t('exportRemoveWatermarkHint')}</div>
              </div>
              <Switch
                className="export-watermark-switch"
                checked={settings.removeWatermark}
                disabled={isExporting}
                onChange={(checked) => set('removeWatermark', checked)}
              />
            </div>
          </section>
        ) : null}

        <div className="export-modal-footer">
          <button type="button" className="export-cancel-btn" onClick={onClose} disabled={isExporting}>
            {t('exportCancel')}
          </button>
          <button
            type="button"
            className="export-confirm-btn"
            disabled={isExporting || rangeDuration <= 0}
            onClick={() => onExport(settings)}
          >
            {isExporting && <Loader2 size={16} className="animate-spin" />}
            {isExporting ? t('exporting') : t('exportVideoTitle')}
          </button>
        </div>
      </div>
    </VokopModal>
  );
}
