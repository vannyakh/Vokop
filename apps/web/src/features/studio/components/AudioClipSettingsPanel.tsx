import { Mic2, Music2, Volume1, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Label } from '@vokop/ui';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import {
  CLIP_FADE_PRESETS,
  CLIP_LEVEL_PRESETS,
  CLIP_VOLUME_PRESETS,
  clipVolumeValue,
  describeAudioSource,
} from '@/features/studio/lib/audioClipMix';

interface AudioClipSettingsPanelProps {
  clip: MediaClip;
  onChange: (patch: Partial<MediaClip>) => void;
  /** Global mix level multiplied with clip volume (original / voice). */
  globalMix?: number;
  globalMixLabel?: string;
  /** Override source badge (e.g. embedded video audio). */
  sourceLabel?: string;
}

function VolumeIcon({ value }: { value: number }) {
  if (value <= 0) return <VolumeX size={14} />;
  if (value < 0.5) return <Volume1 size={14} />;
  return <Volume2 size={14} />;
}

export function AudioClipSettingsPanel({
  clip,
  onChange,
  globalMix = 1,
  globalMixLabel,
  sourceLabel,
}: AudioClipSettingsPanelProps) {
  const volume = clipVolumeValue(clip);
  const volumePct = Math.round(volume * 100);
  const outputPct = Math.round(volume * globalMix * 100);
  const pan = clip.pan ?? 0;
  const fadeIn = clip.fadeInSec ?? 0;
  const fadeOut = clip.fadeOutSec ?? 0;

  return (
    <div className="audio-clip-settings">
      <div className="clip-inspector-grid">
        <div className="clip-inspector-field">
          <span className="clip-inspector-field-label">Source</span>
          <span className="clip-inspector-field-value">{sourceLabel ?? describeAudioSource(clip)}</span>
        </div>
        <div className="clip-inspector-field">
          <span className="clip-inspector-field-label">Output</span>
          <span className="clip-inspector-field-value font-mono">{outputPct}%</span>
        </div>
      </div>

      <div className="tools-vol-row">
        <div className="tools-vol-icon text-accent">
          <VolumeIcon value={volume * globalMix} />
        </div>
        <div className="tools-vol-body">
          <div className="tools-vol-head">
            <span>Clip volume</span>
            <span className="tools-vol-value">{volumePct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={volume}
            onChange={(e) => onChange({ volume: Number(e.target.value), muted: false })}
            className="tools-vol-slider"
            style={{ '--vol-pct': `${(volume / 2) * 100}%` } as React.CSSProperties}
          />
          <div className="tools-vol-presets">
            {CLIP_VOLUME_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={cn('tools-vol-preset', volumePct === p && 'active')}
                onClick={() => onChange({ volume: p / 100, muted: p === 0 })}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {globalMixLabel && (
        <p className="audio-clip-settings-hint">
          {globalMixLabel} · mix {Math.round(globalMix * 100)}%
        </p>
      )}

      <div className="space-y-1.5">
        <div className="tools-vol-head">
          <Label>Stereo pan</Label>
          <span className="tools-vol-value font-mono">
            {pan === 0 ? 'Center' : pan < 0 ? `L ${Math.round(Math.abs(pan) * 100)}` : `R ${Math.round(pan * 100)}`}
          </span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={pan}
          onChange={(e) => onChange({ pan: Number(e.target.value) })}
          className="tools-vol-slider"
          style={{ '--vol-pct': `${((pan + 1) / 2) * 100}%` } as React.CSSProperties}
        />
        <div className="tools-vol-presets">
          {[
            { id: 'L', value: -1 },
            { id: '25L', value: -0.5 },
            { id: 'C', value: 0 },
            { id: '25R', value: 0.5 },
            { id: 'R', value: 1 },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cn('tools-vol-preset', Math.abs(pan - preset.value) < 0.02 && 'active')}
              onClick={() => onChange({ pan: preset.value })}
            >
              {preset.id}
            </button>
          ))}
        </div>
      </div>

      <div className="clip-inspector-grid">
        <div className="space-y-1.5">
          <Label>Fade in (s)</Label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.05}
            className="clip-inspector-input"
            value={Number(fadeIn.toFixed(2))}
            onChange={(e) => onChange({ fadeInSec: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fade out (s)</Label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.05}
            className="clip-inspector-input"
            value={Number(fadeOut.toFixed(2))}
            onChange={(e) => onChange({ fadeOutSec: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
      </div>

      <div className="tools-vol-presets">
        {CLIP_FADE_PRESETS.map((sec) => (
          <button
            key={sec}
            type="button"
            className={cn(
              'tools-vol-preset',
              fadeIn === sec && fadeOut === sec && 'active',
            )}
            onClick={() => onChange({ fadeInSec: sec, fadeOutSec: sec })}
          >
            {sec === 0 ? 'Off' : `${sec}s`}
          </button>
        ))}
      </div>

      <div className="audio-clip-level-presets">
        <span className="audio-clip-level-presets-label">Quick levels</span>
        <div className="audio-clip-level-presets-row">
          {CLIP_LEVEL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="studio-tools-action-btn audio-clip-level-preset-btn"
              onClick={() =>
                onChange({
                  volume: preset.volume,
                  fadeInSec: preset.fadeInSec,
                  fadeOutSec: preset.fadeOutSec,
                  muted: preset.volume === 0,
                })
              }
            >
              {preset.id === 'boost' ? <Mic2 size={12} /> : <Music2 size={12} />}
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={cn('studio-tools-action-btn w-full', clip.muted && 'is-active')}
        onClick={() => onChange({ muted: !clip.muted })}
      >
        {clip.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        {clip.muted ? 'Unmute clip' : 'Mute clip'}
      </button>
    </div>
  );
}
