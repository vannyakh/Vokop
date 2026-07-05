import { useState, useMemo } from 'react';
import { Film, Type, Music2, Clock, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useTranslation } from '@/features/settings';
import { cn } from '@/lib/cn';
import { AudioClipSettingsPanel } from '@/features/studio/components/AudioClipSettingsPanel';
import { CanvasElementPanel } from '@/features/studio/components/CanvasElementPanel';
import { EqualizerEditor } from '@/features/studio/components/EqualizerEditor';
import { InspectorBarSlider } from '@/features/studio/components/InspectorBarSlider';
import { RightPanelEmpty } from '@/features/studio/components/RightPanelEmpty';
import { InspectorDock, InspectorSection } from '@/features/studio/components/InspectorSection';
import { useStudioEdit } from '@/features/studio/hooks/useStudioEdit';
import { clipVolumeValue } from '@/features/studio/lib/audioClipMix';
import { frameReferenceSize } from '@/features/studio/lib/canvasCoords';
import { gainDbFromVolume, volumeFromGainDb, GAIN_DB_MIN, GAIN_DB_MAX } from '@/features/studio/lib/clipEq';
import { Label, Slider, StudioIcon } from '@vokop/ui';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import {
  isAudioLikeTimelineTrack,
  isOverlayTimelineTrack,
  isVideoTimelineTrack,
} from '@/features/studio/lib/timelineTrackUtils';
import { parseSegments } from '@/lib/utils/transcript';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="clip-inspector-field">
      <span className="clip-inspector-field-label">{label}</span>
      <span className="clip-inspector-field-value font-mono">{value}</span>
    </div>
  );
}

function MediaClipInspector({
  clipKind,
  clipId,
}: {
  clipKind: 'video' | 'audio';
  clipId: string;
}) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'voice' | 'speed'>('basic');
  const [voiceCategory, setVoiceCategory] = useState<'filters' | 'characters' | 'song'>('filters');

  const videoClips = useAppStore((s) => s.videoClips);
  const audioClips = useAppStore((s) => s.audioClips);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const {
    updateMediaClip,
    updateVideoTransform,
    extractAudioFromVideo,
    detachAudioFromVideo,
    splitAtPlayhead,
  } = useStudioEdit();
  const removeTimelineClip = useAppStore((s) => s.removeTimelineClip);
  const timelineTrackMuted = useAppStore((s) => s.timelineTrackMuted);
  const toggleTimelineTrackMuted = useAppStore((s) => s.toggleTimelineTrackMuted);
  const originalVolume = useAppStore((s) => s.originalVolume);
  const setOriginalVolume = useAppStore((s) => s.setOriginalVolume);
  const voiceVolume = useAppStore((s) => s.voiceVolume);
  const setVoiceVolume = useAppStore((s) => s.setVoiceVolume);
  const projectEditor = useAppStore((s) => s.projectEditor);
  const getVideoCssFilter = useAppStore((s) => s.getVideoCssFilter);

  const clips = clipKind === 'video' ? videoClips : audioClips;
  const clip = clips.find((item) => item.id === clipId);
  if (!clip) {
    return <p className="clip-inspector-empty">Clip not found.</p>;
  }

  const trackId = clip.trackId ?? (clipKind === 'video' ? 'video' : 'audio');
  const muted = timelineTrackMuted[trackId] ?? false;
  const end = clip.start + clip.duration;
  const Icon = clipKind === 'video' ? Film : Music2;
  const isLinkedAudio = Boolean(clipKind === 'audio' && clip.linkedVideoClipId);
  const globalMix = isLinkedAudio ? originalVolume : voiceVolume;
  const globalMixLabel = isLinkedAudio ? 'Original mix' : 'Voice mix';
  const clipVolumePct = Math.round(clipVolumeValue(clip) * 100);
  // clip.x/y/width/height are fractions of the content rect; display as a stable
  // "nominal px" number (relative to the project's video resolution) for editing.
  const refSize = frameReferenceSize(videoWidth, videoHeight);

  return (
    <InspectorDock
      title={clipKind === 'video' ? 'Video clip' : 'Audio clip'}
      icon={<Icon size={12} className="text-accent" />}
    >
      {/* Sub tabs layout (CapCut-inspired) */}
      <div className="flex border-b border-[color:var(--border)] mb-4" style={{ margin: '0 -16px 16px -16px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('basic')}
          className={cn(
            'flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer',
            activeSubTab === 'basic'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-text',
          )}
        >
          Basic
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('voice')}
          className={cn(
            'flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer',
            activeSubTab === 'voice'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-text',
          )}
        >
          {t('voiceChanger')}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('speed')}
          className={cn(
            'flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer',
            activeSubTab === 'speed'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-text',
          )}
        >
          {t('speed')}
        </button>
      </div>

      {activeSubTab === 'basic' && (
        <>
          <InspectorSection id="clip-info" title="Clip" summary={clip.name} defaultOpen>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <input
                className="clip-inspector-input"
                value={clip.name}
                onChange={(e) => updateMediaClip(clip.id, { name: e.target.value })}
              />
            </div>
            <div className="clip-inspector-grid">
              <Field label="Start" value={formatStudioTimecode(clip.start)} />
              <Field label="End" value={formatStudioTimecode(end)} />
              <Field label="Duration" value={formatStudioTimecode(clip.duration)} />
              <Field label="In point" value={formatStudioTimecode(clip.sourceStart)} />
            </div>
          </InspectorSection>

          <InspectorSection
            id="clip-timing"
            title="Timing"
            summary={formatStudioTimecode(clip.duration)}
            defaultOpen
          >
            <div className="space-y-1.5">
              <Label>Timeline start (s)</Label>
              <input
                type="number"
                min={0}
                step={0.1}
                className="clip-inspector-input"
                value={Number(clip.start.toFixed(2))}
                onChange={(e) =>
                  updateMediaClip(clip.id, { start: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (s)</Label>
              <input
                type="number"
                min={0.4}
                step={0.1}
                className="clip-inspector-input"
                value={Number(clip.duration.toFixed(2))}
                onChange={(e) =>
                  updateMediaClip(clip.id, {
                    duration: Math.max(0.4, Number(e.target.value) || 0.4),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source in-point (s)</Label>
              <input
                type="number"
                min={0}
                step={0.1}
                className="clip-inspector-input"
                value={Number(clip.sourceStart.toFixed(2))}
                onChange={(e) =>
                  updateMediaClip(clip.id, {
                    sourceStart: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </div>
          </InspectorSection>

          {clipKind === 'video' && (
            <>
              <InspectorSection
                id="clip-composition"
                title="Composition"
                summary={
                  clip.width != null
                    ? `${Math.round(clip.width * refSize.width)}×${Math.round((clip.height ?? 0) * refSize.height)}`
                    : 'Frame'
                }
                defaultOpen
              >
                <div className="clip-inspector-grid">
                  <div className="space-y-1.5">
                    <Label>X</Label>
                    <input
                      type="number"
                      step={1}
                      className="clip-inspector-input"
                      value={Number(((clip.x ?? 0) * refSize.width).toFixed(0))}
                      onChange={(e) =>
                        updateVideoTransform(clip.id, {
                          x: (Number(e.target.value) || 0) / refSize.width,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Y</Label>
                    <input
                      type="number"
                      step={1}
                      className="clip-inspector-input"
                      value={Number(((clip.y ?? 0) * refSize.height).toFixed(0))}
                      onChange={(e) =>
                        updateVideoTransform(clip.id, {
                          y: (Number(e.target.value) || 0) / refSize.height,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Width</Label>
                    <input
                      type="number"
                      min={48}
                      step={1}
                      className="clip-inspector-input"
                      value={Number(((clip.width ?? 0) * refSize.width).toFixed(0))}
                      onChange={(e) =>
                        updateVideoTransform(clip.id, {
                          width: Math.max(48, Number(e.target.value) || 48) / refSize.width,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Height</Label>
                    <input
                      type="number"
                      min={48}
                      step={1}
                      className="clip-inspector-input"
                      value={Number(((clip.height ?? 0) * refSize.height).toFixed(0))}
                      onChange={(e) =>
                        updateVideoTransform(clip.id, {
                          height: Math.max(48, Number(e.target.value) || 48) / refSize.height,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rotation</Label>
                    <input
                      type="number"
                      step={1}
                      className="clip-inspector-input"
                      value={Number((clip.rotation ?? 0).toFixed(0))}
                      onChange={(e) =>
                        updateVideoTransform(clip.id, {
                          rotation: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Opacity</Label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      value={clip.opacity ?? 1}
                      onChange={(e) =>
                        updateVideoTransform(clip.id, {
                          opacity: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </InspectorSection>

              <InspectorSection
                id="clip-video-fx"
                title="Video"
                summary={`${(clip.speed ?? 1).toFixed(2)}x`}
                defaultOpen={false}
              >
                <InspectorBarSlider
                  label="Speed"
                  value={clip.speed ?? 1}
                  min={0.25}
                  max={4}
                  step={0.05}
                  defaultValue={1}
                  format={(v) => `${v.toFixed(2)}x`}
                  onChange={(v) => updateMediaClip(clip.id, { speed: v })}
                  resetTitle="Reset to 1x"
                />
                <InspectorBarSlider
                  label="Fade In"
                  value={clip.videoFadeInSec ?? 0}
                  min={0}
                  max={5}
                  step={0.1}
                  defaultValue={0}
                  format={(v) => `${v.toFixed(1)}s`}
                  onChange={(v) => updateMediaClip(clip.id, { videoFadeInSec: v })}
                  resetTitle="Reset to 0"
                />
                <InspectorBarSlider
                  label="Fade Out"
                  value={clip.videoFadeOutSec ?? 0}
                  min={0}
                  max={5}
                  step={0.1}
                  defaultValue={0}
                  format={(v) => `${v.toFixed(1)}s`}
                  onChange={(v) => updateMediaClip(clip.id, { videoFadeOutSec: v })}
                  resetTitle="Reset to 0"
                />
              </InspectorSection>

              <InspectorSection
                id="clip-video"
                title="Audio"
                summary={`${clipVolumePct}% · orig ${Math.round(originalVolume * 100)}%`}
                defaultOpen={false}
              >
                <InspectorBarSlider
                  label="Gain"
                  value={gainDbFromVolume(clipVolumeValue(clip))}
                  min={GAIN_DB_MIN}
                  max={GAIN_DB_MAX}
                  step={0.5}
                  defaultValue={0}
                  format={(v) => (v <= GAIN_DB_MIN ? '-\u221e dB' : `${v.toFixed(1)}dB`)}
                  onChange={(v) => updateMediaClip(clip.id, { volume: volumeFromGainDb(v), muted: false })}
                  resetTitle="Reset gain"
                />
                <div className="space-y-1.5">
                  <Label>Original mix (global)</Label>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={originalVolume}
                    onChange={(e) => setOriginalVolume(Number(e.target.value))}
                  />
                </div>
                <AudioClipSettingsPanel
                  clip={clip}
                  onChange={(patch) => updateMediaClip(clip.id, patch)}
                  globalMix={originalVolume}
                  sourceLabel="Embedded in video"
                />
                <div className="clip-inspector-grid">
                  <Field
                    label="Filter"
                    value={
                      projectEditor.videoFilterId ??
                      (getVideoCssFilter() === 'none' ? 'None' : 'Custom')
                    }
                  />
                  <Field
                    label="Transition in"
                    value={projectEditor.clipEdits[clip.id]?.transitionInId ?? 'None'}
                  />
                  <Field
                    label="Transition out"
                    value={projectEditor.clipEdits[clip.id]?.transitionOutId ?? 'None'}
                  />
                </div>
              </InspectorSection>
            </>
          )}

          {clipKind === 'audio' && (
            <InspectorSection
              id="clip-audio"
              title="Audio settings"
              summary={`${clipVolumePct}% · ${globalMixLabel.toLowerCase()}`}
              defaultOpen
            >
              <InspectorBarSlider
                label="Gain"
                value={gainDbFromVolume(clipVolumeValue(clip))}
                min={GAIN_DB_MIN}
                max={GAIN_DB_MAX}
                step={0.5}
                defaultValue={0}
                format={(v) => (v <= GAIN_DB_MIN ? '-\u221e dB' : `${v.toFixed(1)}dB`)}
                onChange={(v) => updateMediaClip(clip.id, { volume: volumeFromGainDb(v), muted: false })}
                resetTitle="Reset gain"
              />
              <div className="space-y-1.5">
                <Label>{globalMixLabel} (global)</Label>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={globalMix}
                  onChange={(e) =>
                    isLinkedAudio
                      ? setOriginalVolume(Number(e.target.value))
                      : setVoiceVolume(Number(e.target.value))
                  }
                />
              </div>
              <AudioClipSettingsPanel
                clip={clip}
                onChange={(patch) => updateMediaClip(clip.id, patch)}
                globalMix={globalMix}
                globalMixLabel={globalMixLabel}
              />
            </InspectorSection>
          )}

          <InspectorSection
            id="clip-eq"
            title="Equalizer"
            summary={clip.eq?.enabled ? 'On' : 'Off'}
            defaultOpen={false}
          >
            <EqualizerEditor
              eq={clip.eq}
              onChange={(eq) => updateMediaClip(clip.id, { eq })}
            />
          </InspectorSection>
        </>
      )}

      {activeSubTab === 'voice' && (
        <div className="space-y-4 py-1">
          {/* Sub category header */}
          <div className="flex gap-2 p-0.5 bg-[var(--surface-hi)] border border-[color:var(--border)] rounded-lg">
            {['filters', 'characters', 'song'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setVoiceCategory(cat as any)}
                className={cn(
                  'flex-1 py-1 text-[10px] font-bold text-center rounded-md transition-colors cursor-pointer',
                  voiceCategory === cat
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-text'
                )}
              >
                {cat === 'filters' ? t('voiceFilters') : cat === 'characters' ? t('voiceCharacters') : t('speechToSong')}
              </button>
            ))}
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'original', label: 'Original', pitch: 50, timbre: 50 },
              { id: 'echo', label: 'Echo', pitch: 50, timbre: 50, pro: true },
              { id: 'micHog', label: 'Mic Hog', pitch: 50, timbre: 50 },
              { id: 'micEcho', label: 'Mic Echo', pitch: 50, timbre: 50 },
              { id: 'high', label: 'High', pitch: 83, timbre: 33 },
              { id: 'low', label: 'Low', pitch: 25, timbre: 75 },
              { id: 'fullVoice', label: 'Full Voice', pitch: 60, timbre: 40 },
              { id: 'bassBoost', label: 'Bass Boost', pitch: 45, timbre: 55 }
            ].map((f) => {
              const active = (clip.voiceFilter || 'original') === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    updateMediaClip(clip.id, {
                      voiceFilter: f.id,
                      voicePitch: f.pitch,
                      voiceTimbre: f.timbre
                    });
                  }}
                  className={cn(
                    'relative aspect-square flex flex-col items-center justify-center p-1 rounded-lg border text-center transition-all cursor-pointer',
                    active
                      ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent'
                      : 'border-[color:var(--border)] bg-[var(--surface-hi)] text-muted hover:border-[color:var(--border-strong)] hover:text-text'
                  )}
                >
                  <span className="text-[10px] font-semibold tracking-tight leading-tight">{f.label}</span>
                  {f.pro && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-violet-500 rounded-full" title="Pro effect" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Adjustments */}
          <div className="space-y-4 pt-4 border-t border-[color:var(--border)]">
            {/* Pitch slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted">{t('pitch')}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={clip.voicePitch ?? 50}
                    onChange={(e) => updateMediaClip(clip.id, { voicePitch: Math.max(0, Math.min(100, Number(e.target.value) || 50)) })}
                    className="w-12 h-6 px-1 text-center bg-[var(--surface-hi)] border border-[color:var(--border)] rounded text-[10px] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => updateMediaClip(clip.id, { voicePitch: 50 })}
                    className="p-1 hover:bg-[var(--surface-hi)] rounded text-muted cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={clip.voicePitch ?? 50}
                onChange={(e) => updateMediaClip(clip.id, { voicePitch: Number(e.target.value) })}
                className="w-full h-1 bg-[color:var(--border)] rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            {/* Timbre slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted">{t('timbre')}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={clip.voiceTimbre ?? 50}
                    onChange={(e) => updateMediaClip(clip.id, { voiceTimbre: Math.max(0, Math.min(100, Number(e.target.value) || 50)) })}
                    className="w-12 h-6 px-1 text-center bg-[var(--surface-hi)] border border-[color:var(--border)] rounded text-[10px] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => updateMediaClip(clip.id, { voiceTimbre: 50 })}
                    className="p-1 hover:bg-[var(--surface-hi)] rounded text-muted cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={clip.voiceTimbre ?? 50}
                onChange={(e) => updateMediaClip(clip.id, { voiceTimbre: Number(e.target.value) })}
                className="w-full h-1 bg-[color:var(--border)] rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'speed' && (
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">{t('speed')}</span>
              <span className="font-mono text-accent font-bold">{(clip.speed ?? 1.0).toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.25}
              max={4.0}
              step={0.05}
              value={clip.speed ?? 1.0}
              onChange={(e) => updateMediaClip(clip.id, { speed: Number(e.target.value) })}
              className="w-full h-1 bg-[color:var(--border)] rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>

          <div className="flex gap-2">
            {[0.5, 1.0, 1.5, 2.0, 4.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateMediaClip(clip.id, { speed: s })}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-bold text-center rounded-lg border transition-colors cursor-pointer',
                  (clip.speed ?? 1.0) === s
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-[color:var(--border)] bg-[var(--surface-hi)] text-muted hover:border-[color:var(--border-strong)] hover:text-text'
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}

      <InspectorSection id="clip-actions" title="Actions" defaultOpen>
        <button
          type="button"
          className="studio-tools-action-btn w-full"
          onClick={() => toggleTimelineTrackMuted(trackId)}
        >
          {muted ? <StudioIcon name="volumeSlash" size={13} /> : <StudioIcon name="volume" size={13} />}
          {muted ? 'Unmute track' : 'Mute track'}
        </button>
        {clipKind === 'video' && (
          <div className="clip-inspector-actions">
            <button
              type="button"
              className="studio-tools-action-btn"
              title="Copy audio to the audio track (video keeps sound)"
              onClick={() => extractAudioFromVideo(clip.id)}
            >
              Extract audio
            </button>
            <button
              type="button"
              className="studio-tools-action-btn"
              title="Move audio to the audio track and mute video"
              onClick={() => detachAudioFromVideo(clip.id)}
            >
              Detach audio
            </button>
          </div>
        )}
        {clipKind === 'video' && clip.muted && (
          <button
            type="button"
            className="studio-tools-action-btn w-full"
            onClick={() => updateMediaClip(clip.id, { muted: false })}
          >
            Restore video sound
          </button>
        )}
        <div className="clip-inspector-actions">
          <button type="button" className="studio-tools-action-btn" onClick={splitAtPlayhead}>
            <StudioIcon name="scissors" size={13} />
            Split
          </button>
          <button
            type="button"
            className="studio-tools-action-btn studio-tools-action-btn--danger"
            onClick={() => removeTimelineClip(trackId, clip.id)}
          >
            <StudioIcon name="bin" size={13} />
            Delete
          </button>
        </div>
      </InspectorSection>
    </InspectorDock>
  );
}

function SegmentInspector({
  clipId,
}: {
  clipId: string;
}) {
  const transcript = useAppStore((s) => s.transcript);
  const translatedText = useAppStore((s) => s.translatedText);
  const updateSegment = useAppStore((s) => s.updateSegment);
  const updateSegmentTime = useAppStore((s) => s.updateSegmentTime);
  const updateSegmentDuration = useAppStore((s) => s.updateSegmentDuration);
  const removeTimelineClip = useAppStore((s) => s.removeTimelineClip);
  const seekTimeline = useAppStore((s) => s.seekTimeline);

  const meta = clipId.match(/^(translation|transcript)-(\d+)$/);
  if (!meta) return <p className="clip-inspector-empty">Segment not found.</p>;

  const type = meta[1] as 'translation' | 'transcript';
  const index = Number(meta[2]);
  const segments = parseSegments(type === 'transcript' ? transcript : translatedText);
  const segment = segments[index];
  if (!segment) return <p className="clip-inspector-empty">Segment not found.</p>;

  const next = segments[index + 1];
  const duration = next ? Math.max(0.4, next.time - segment.time) : 4;

  return (
    <InspectorDock
      title={type === 'transcript' ? 'Transcript segment' : 'Translation segment'}
      icon={<Type size={12} className="text-accent" />}
    >
      <InspectorSection id="segment-content" title="Content" defaultOpen>
        <div className="clip-inspector-grid">
          <Field label="Start" value={formatStudioTimecode(segment.time)} />
          <Field label="Duration" value={formatStudioTimecode(duration)} />
        </div>
        {segment.speaker && <Field label="Speaker" value={segment.speaker} />}
        <div className="space-y-1.5">
          <Label>Text</Label>
          <textarea
            className="clip-inspector-textarea"
            rows={4}
            value={segment.text}
            onChange={(e) => updateSegment(index, e.target.value, type)}
          />
        </div>
      </InspectorSection>

      <InspectorSection id="segment-timing" title="Timing" defaultOpen={false}>
        <div className="space-y-1.5">
          <Label>Start (s)</Label>
          <input
            type="number"
            min={0}
            step={0.1}
            className="clip-inspector-input"
            value={Number(segment.time.toFixed(2))}
            onChange={(e) => updateSegmentTime(index, Math.max(0, Number(e.target.value) || 0), type)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Duration (s)</Label>
          <input
            type="number"
            min={0.4}
            step={0.1}
            className="clip-inspector-input"
            value={Number(duration.toFixed(2))}
            onChange={(e) =>
              updateSegmentDuration(index, Math.max(0.4, Number(e.target.value) || 0.4), type)
            }
          />
        </div>
      </InspectorSection>

      <InspectorSection id="segment-actions" title="Actions" defaultOpen={false}>
        <div className="clip-inspector-actions">
          <button
            type="button"
            className="studio-tools-action-btn"
            onClick={() => seekTimeline(segment.time)}
          >
            <Clock size={13} />
            Seek
          </button>
          <button
            type="button"
            className="studio-tools-action-btn studio-tools-action-btn--danger"
            onClick={() => removeTimelineClip('text', clipId)}
          >
            <StudioIcon name="bin" size={13} />
            Delete
          </button>
        </div>
      </InspectorSection>
    </InspectorDock>
  );
}

function isSegmentClipId(clipId: string): boolean {
  return /^(translation|transcript)-\d+$/.test(clipId);
}

export function ClipInspectorPanel() {
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const selectedCanvasElementId = useAppStore((s) => s.selectedCanvasElementId);
  const canvasElements = useAppStore((s) => s.canvasElements);

  if (!selectedTimelineClip && !selectedCanvasElementId) {
    return <RightPanelEmpty message="Select an item to make adjustment" />;
  }

  const trackId = selectedTimelineClip?.trackId;
  const clipId = selectedTimelineClip?.clipId;

  if (clipId && trackId) {
    if (isVideoTimelineTrack(trackId)) {
      return <MediaClipInspector clipKind="video" clipId={clipId} />;
    }
    if (isAudioLikeTimelineTrack(trackId)) {
      return <MediaClipInspector clipKind="audio" clipId={clipId} />;
    }
  }

  // Caption segments (translation-0 / transcript-0).
  if (clipId && isSegmentClipId(clipId)) {
    return <SegmentInspector clipId={clipId} />;
  }

  // Text templates, logos, images, and other canvas-backed clips.
  if (
    selectedCanvasElementId ||
    (clipId && canvasElements.some((el) => el.id === clipId)) ||
    (trackId && isOverlayTimelineTrack(trackId))
  ) {
    return <CanvasElementPanel />;
  }

  return <RightPanelEmpty message="Select an item to make adjustment" />;
}
