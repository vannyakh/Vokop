import { useMemo, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { Select } from '@vokop/ui';
import { cn } from '@/lib/cn';
import {
  EQ_BAND_TYPE_LABELS,
  EQ_MAX_DB,
  EQ_MIN_DB,
  EQ_PRESETS,
  applyEqPreset,
  computeEqResponseDb,
  dbToY,
  defaultClipEq,
  ensureClipEq,
  freqToX,
  xToFreq,
  yToDb,
  type ClipEq,
  type EqBand,
  type EqBandType,
} from '@/features/studio/lib/clipEq';

const CURVE_SAMPLES = 64;
const FREQ_AXIS_TICKS = [
  { hz: 31, label: '31' },
  { hz: 62, label: '62' },
  { hz: 125, label: '125' },
  { hz: 250, label: '250' },
  { hz: 500, label: '500' },
  { hz: 1000, label: '1k' },
  { hz: 2000, label: '2k' },
  { hz: 4000, label: '4k' },
  { hz: 8000, label: '8k' },
  { hz: 16000, label: '16k' },
];
const DB_AXIS_TICKS = [EQ_MAX_DB, EQ_MAX_DB / 2, 0, EQ_MIN_DB / 2, EQ_MIN_DB];

function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)}k` : String(Math.round(hz));
}

function bandHasGain(type: EqBandType): boolean {
  return type !== 'highpass' && type !== 'lowpass';
}

function bandHasQ(type: EqBandType): boolean {
  return type === 'peaking';
}

interface EqualizerEditorProps {
  eq: ClipEq | undefined;
  onChange: (eq: ClipEq) => void;
}

export function EqualizerEditor({ eq, onChange }: EqualizerEditorProps) {
  const value = ensureClipEq(eq);
  const curveRef = useRef<HTMLDivElement | null>(null);

  const curvePath = useMemo(() => {
    const enabledBands = value.bands.filter((b) => b.enabled);
    const points: string[] = [];
    for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
      const xFrac = i / CURVE_SAMPLES;
      const freq = xToFreq(xFrac);
      const db = computeEqResponseDb(enabledBands, freq);
      const yFrac = dbToY(db);
      points.push(`${(xFrac * 100).toFixed(2)},${(yFrac * 100).toFixed(2)}`);
    }
    return `M ${points.join(' L ')}`;
  }, [value.bands]);

  function updateBand(id: string, patch: Partial<EqBand>) {
    onChange({ ...value, bands: value.bands.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  }

  function handleDragStart(bandId: string, allowGain: boolean) {
    return (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const move = (clientX: number, clientY: number) => {
        const track = curveRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const xFrac = Math.min(1, Math.max(0, (clientX - rect.left) / (rect.width || 1)));
        const patch: Partial<EqBand> = { freq: Math.round(xToFreq(xFrac)) };
        if (allowGain) {
          const yFrac = Math.min(1, Math.max(0, (clientY - rect.top) / (rect.height || 1)));
          patch.gainDb = Math.round(yToDb(yFrac) * 10) / 10;
        }
        updateBand(bandId, patch);
      };
      move(e.clientX, e.clientY);
      const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  return (
    <div className="eq-editor">
      <div className="eq-editor-header">
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          aria-label="Turn clip EQ on"
          className={cn('eq-toggle-switch', value.enabled && 'is-on')}
          onClick={() => onChange({ ...value, enabled: !value.enabled })}
        >
          <span className="eq-toggle-switch-thumb" />
        </button>
        <Select
          className="eq-preset-select"
          value={value.preset}
          disabled={!value.enabled}
          onChange={(e) => onChange(applyEqPreset(e.target.value))}
        >
          {EQ_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        <button
          type="button"
          className="eq-reset-btn"
          aria-label="Reset EQ"
          disabled={!value.enabled}
          onClick={() => onChange(defaultClipEq())}
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      <div className={cn('eq-editor-body', !value.enabled && 'is-disabled')}>
        <div ref={curveRef} className="eq-curve">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="eq-curve-svg" aria-hidden>
            {DB_AXIS_TICKS.map((db) => (
              <line
                key={db}
                x1={0}
                y1={dbToY(db) * 100}
                x2={100}
                y2={dbToY(db) * 100}
                className={cn('eq-curve-gridline', db === 0 && 'eq-curve-gridline--zero')}
              />
            ))}
            {FREQ_AXIS_TICKS.map((tick) => (
              <line
                key={tick.hz}
                x1={freqToX(tick.hz) * 100}
                y1={0}
                x2={freqToX(tick.hz) * 100}
                y2={100}
                className="eq-curve-gridline eq-curve-gridline--vertical"
              />
            ))}
            <path d={curvePath} className="eq-curve-path" vectorEffect="non-scaling-stroke" />
          </svg>

          {DB_AXIS_TICKS.map((db) => (
            <span
              key={db}
              className="eq-curve-axis-label eq-curve-axis-label--db"
              style={{ top: `${dbToY(db) * 100}%` }}
            >
              {db > 0 ? `+${db}` : db}
            </span>
          ))}
          {FREQ_AXIS_TICKS.map((tick) => (
            <span
              key={tick.hz}
              className="eq-curve-axis-label eq-curve-axis-label--freq"
              style={{ left: `${freqToX(tick.hz) * 100}%` }}
            >
              {tick.label}
            </span>
          ))}

          {value.bands.map((band, i) => (
            <button
              key={band.id}
              type="button"
              className={cn('eq-band-handle', !band.enabled && 'is-off')}
              style={{
                left: `${freqToX(band.freq) * 100}%`,
                top: `${dbToY(bandHasGain(band.type) ? band.gainDb : 0) * 100}%`,
              }}
              title={`Band ${i + 1} ${EQ_BAND_TYPE_LABELS[band.type]} ${band.gainDb.toFixed(1)} dB @ ${formatHz(band.freq)}`}
              onPointerDown={handleDragStart(band.id, bandHasGain(band.type))}
            >
              <span>{i + 1}</span>
            </button>
          ))}
        </div>

        <div className="eq-band-grid">
          {value.bands.map((band, i) => (
            <button
              key={band.id}
              type="button"
              className={cn('eq-band-toggle', band.enabled && 'is-on')}
              onClick={() => updateBand(band.id, { enabled: !band.enabled })}
            >
              B {i + 1}
            </button>
          ))}
        </div>

        <div className="eq-band-grid">
          {value.bands.map((band) => (
            <Select
              key={band.id}
              className="eq-band-type-select"
              title={EQ_BAND_TYPE_LABELS[band.type]}
              value={band.type}
              onChange={(e) => updateBand(band.id, { type: e.target.value as EqBandType })}
            >
              {(Object.keys(EQ_BAND_TYPE_LABELS) as EqBandType[]).map((type) => (
                <option key={type} value={type}>
                  {EQ_BAND_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          ))}
        </div>

        <div className="eq-band-grid">
          {value.bands.map((band) => (
            <div key={band.id} className="eq-value-input">
              <input
                inputMode="decimal"
                type="text"
                value={Math.round(band.freq)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) updateBand(band.id, { freq: Math.min(20000, Math.max(20, n)) });
                }}
              />
              <span className="eq-value-unit">Hz</span>
            </div>
          ))}
        </div>

        <div className="eq-band-grid">
          {value.bands.map((band) =>
            bandHasGain(band.type) ? (
              <div key={band.id} className="eq-value-input">
                <input
                  inputMode="decimal"
                  type="text"
                  value={band.gainDb.toFixed(2)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) updateBand(band.id, { gainDb: Math.min(EQ_MAX_DB, Math.max(EQ_MIN_DB, n)) });
                  }}
                />
                <span className="eq-value-unit">dB</span>
              </div>
            ) : (
              <div key={band.id} />
            ),
          )}
        </div>

        <div className="eq-band-grid">
          {value.bands.map((band) =>
            bandHasQ(band.type) ? (
              <div key={band.id} className="eq-value-input">
                <input
                  inputMode="decimal"
                  type="text"
                  value={band.q.toFixed(2)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) updateBand(band.id, { q: Math.min(10, Math.max(0.1, n)) });
                  }}
                />
                <span className="eq-value-unit">Q</span>
              </div>
            ) : (
              <div key={band.id} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
