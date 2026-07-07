import { useMemo, useState } from 'react';
import {
  Clapperboard,
  Droplets,
  Film,
  Gauge,
  Layers,
  Mic2,
  Music2,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useTranslation } from '@/features/settings';
import { cn } from '@/lib/cn';
import { AudioClipSettingsPanel } from '@/features/studio/components/AudioClipSettingsPanel';
import { CompositionBackgroundPanel } from '@/features/studio/components/CompositionBackgroundPanel';
import { EqualizerEditor } from '@/features/studio/components/EqualizerEditor';
import { InspectorField, InspectorFields } from '@/features/studio/components/InspectorField';
import { InspectorNumberField } from '@/features/studio/components/InspectorNumberField';
import {
  InspectorPropertiesShell,
  type InspectorTabDef,
} from '@/features/studio/components/InspectorPropertiesShell';
import { InspectorSection } from '@/features/studio/components/InspectorSection';
import { PropertyRow } from '@/features/studio/components/PropertyRow';
import { useInspectorTabState } from '@/features/studio/hooks/useInspectorTabState';
import { useStudioEdit } from '@/features/studio/hooks/useStudioEdit';
import { clipVolumeValue } from '@/features/studio/lib/audioClipMix';
import { frameReferenceSize } from '@/features/studio/lib/canvasCoords';
import { gainDbFromVolume, volumeFromGainDb, GAIN_DB_MIN, GAIN_DB_MAX } from '@/features/studio/lib/clipEq';
import { StudioIcon } from '@vokop/ui';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';

const VIDEO_TAB_IDS = ['transform', 'blending', 'audio', 'speed', 'background', 'voice'] as const;
const AUDIO_TAB_IDS = ['clip', 'audio', 'eq'] as const;

type VideoTabId = (typeof VIDEO_TAB_IDS)[number];
type AudioTabId = (typeof AUDIO_TAB_IDS)[number];

function ClipActionsFooter({
  clipKind,
  clipId,
  trackId,
  muted,
  clipMuted,
}: {
  clipKind: 'video' | 'audio';
  clipId: string;
  trackId: string;
  muted: boolean;
  clipMuted?: boolean;
}) {
  const {
    updateMediaClip,
    extractAudioFromVideo,
    detachAudioFromVideo,
    splitAtPlayhead,
  } = useStudioEdit();
  const toggleTimelineTrackMuted = useAppStore((s) => s.toggleTimelineTrackMuted);
  const removeTimelineClip = useAppStore((s) => s.removeTimelineClip);

  return (
    <InspectorSection id={`${clipId}-actions`} title="Actions" defaultOpen={false}>
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
            onClick={() => extractAudioFromVideo(clipId)}
          >
            Extract audio
          </button>
          <button
            type="button"
            className="studio-tools-action-btn"
            onClick={() => detachAudioFromVideo(clipId)}
          >
            Detach audio
          </button>
        </div>
      )}
      {clipKind === 'video' && clipMuted && (
        <button
          type="button"
          className="studio-tools-action-btn w-full"
          onClick={() => updateMediaClip(clipId, { muted: false })}
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
          onClick={() => removeTimelineClip(trackId, clipId)}
        >
          <StudioIcon name="bin" size={13} />
          Delete
        </button>
      </div>
    </InspectorSection>
  );
}

export function MediaClipInspector({
  clipKind,
  clipId,
}: {
  clipKind: 'video' | 'audio';
  clipId: string;
}) {
  const { t } = useTranslation();
  const [voiceCategory, setVoiceCategory] = useState<'filters' | 'characters' | 'song'>('filters');

  const videoClips = useAppStore((s) => s.videoClips);
  const audioClips = useAppStore((s) => s.audioClips);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const {
    updateMediaClip,
    updateVideoTransform,
  } = useStudioEdit();
  const timelineTrackMuted = useAppStore((s) => s.timelineTrackMuted);
  const originalVolume = useAppStore((s) => s.originalVolume);
  const setOriginalVolume = useAppStore((s) => s.setOriginalVolume);
  const voiceVolume = useAppStore((s) => s.voiceVolume);
  const setVoiceVolume = useAppStore((s) => s.setVoiceVolume);
  const projectEditor = useAppStore((s) => s.projectEditor);
  const updateClipBackground = useAppStore((s) => s.updateClipBackground);
  const applyBackgroundToAllVideoClips = useAppStore((s) => s.applyBackgroundToAllVideoClips);
  const getVideoCssFilter = useAppStore((s) => s.getVideoCssFilter);

  const videoTabs = useMemo<InspectorTabDef[]>(
    () => [
      { id: 'transform', label: 'Transform', icon: <SlidersHorizontal size={16} /> },
      { id: 'blending', label: 'Blending', icon: <Droplets size={16} /> },
      { id: 'audio', label: 'Audio', icon: <Volume2 size={16} /> },
      { id: 'speed', label: 'Speed', icon: <Gauge size={16} /> },
      { id: 'background', label: 'Background', icon: <Layers size={16} /> },
      { id: 'voice', label: String(t('voiceChanger')), icon: <Mic2 size={16} /> },
    ],
    [t],
  );

  const audioTabs = useMemo<InspectorTabDef[]>(
    () => [
      { id: 'clip', label: 'Clip', icon: <Film size={16} /> },
      { id: 'audio', label: 'Audio', icon: <Volume2 size={16} /> },
      { id: 'eq', label: 'Equalizer', icon: <SlidersHorizontal size={16} /> },
    ],
    [],
  );

  const [videoTab, setVideoTab] = useInspectorTabState('video-clip', 'transform', VIDEO_TAB_IDS);
  const [audioTab, setAudioTab] = useInspectorTabState('audio-clip', 'clip', AUDIO_TAB_IDS);

  const clips = clipKind === 'video' ? videoClips : audioClips;
  const clip = clips.find((item) => item.id === clipId);
  if (!clip) {
    return <p className="clip-inspector-empty">Clip not found.</p>;
  }

  const clipBackground = clip.background ?? projectEditor.compositionBackground;
  const trackId = clip.trackId ?? (clipKind === 'video' ? 'video' : 'audio');
  const muted = timelineTrackMuted[trackId] ?? false;
  const end = clip.start + clip.duration;
  const Icon = clipKind === 'video' ? Film : Music2;
  const isLinkedAudio = Boolean(clipKind === 'audio' && clip.linkedVideoClipId);
  const globalMix = isLinkedAudio ? originalVolume : voiceVolume;
  const globalMixLabel = isLinkedAudio ? 'Original mix' : 'Voice mix';
  const clipVolumePct = Math.round(clipVolumeValue(clip) * 100);
  const refSize = frameReferenceSize(videoWidth, videoHeight);

  const clipInfoSection = (
    <InspectorSection
      id={`${clip.id}-clip`}
      title="Clip"
      summary={formatStudioTimecode(clip.duration)}
      defaultOpen
    >
      <InspectorFields>
        <PropertyRow label="Name">
          <input
            className="clip-inspector-input"
            value={clip.name}
            onChange={(e) => updateMediaClip(clip.id, { name: e.target.value })}
          />
        </PropertyRow>
        <PropertyRow label="Start">
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
          <span className="property-row-unit">s</span>
        </PropertyRow>
        <PropertyRow label="Duration">
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
          <span className="property-row-unit">s</span>
        </PropertyRow>
        <PropertyRow label="In point">
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
          <span className="property-row-unit">s</span>
        </PropertyRow>
        <PropertyRow label="End">
          <span className="property-row-value-readonly">{formatStudioTimecode(end)}</span>
        </PropertyRow>
      </InspectorFields>
    </InspectorSection>
  );

  const transformSection =
    clipKind === 'video' ? (
      <InspectorSection
        id={`${clip.id}-transform`}
        title="Transform"
        summary={
          clip.width != null
            ? `${Math.round(clip.width * refSize.width)}×${Math.round((clip.height ?? 0) * refSize.height)}`
            : 'Frame'
        }
        defaultOpen
      >
        <InspectorFields>
          <InspectorField label="X">
            <InspectorNumberField
              icon="X"
              value={(clip.x ?? 0) * refSize.width}
              min={-refSize.width}
              max={refSize.width * 2}
              step={1}
              scrubPixelsPerUnit={2}
              format={(v) => `${Math.round(v)}px`}
              isDefault={(clip.x ?? 0) === 0}
              onChange={(v) => updateVideoTransform(clip.id, { x: v / refSize.width })}
              onReset={() => updateVideoTransform(clip.id, { x: 0 })}
            />
          </InspectorField>
          <InspectorField label="Y">
            <InspectorNumberField
              icon="Y"
              value={(clip.y ?? 0) * refSize.height}
              min={-refSize.height}
              max={refSize.height * 2}
              step={1}
              scrubPixelsPerUnit={2}
              format={(v) => `${Math.round(v)}px`}
              isDefault={(clip.y ?? 0) === 0}
              onChange={(v) => updateVideoTransform(clip.id, { y: v / refSize.height })}
              onReset={() => updateVideoTransform(clip.id, { y: 0 })}
            />
          </InspectorField>
          <InspectorField label="Width">
            <InspectorNumberField
              icon="W"
              value={(clip.width ?? 0) * refSize.width}
              min={48}
              max={refSize.width * 2}
              step={1}
              scrubPixelsPerUnit={2}
              format={(v) => `${Math.round(v)}px`}
              isDefault={Math.abs((clip.width ?? 1) - 1) < 0.001}
              onChange={(v) =>
                updateVideoTransform(clip.id, { width: Math.max(48, v) / refSize.width })
              }
              onReset={() => updateVideoTransform(clip.id, { width: 1 })}
            />
          </InspectorField>
          <InspectorField label="Height">
            <InspectorNumberField
              icon="H"
              value={(clip.height ?? 0) * refSize.height}
              min={48}
              max={refSize.height * 2}
              step={1}
              scrubPixelsPerUnit={2}
              format={(v) => `${Math.round(v)}px`}
              isDefault={Math.abs((clip.height ?? 1) - 1) < 0.001}
              onChange={(v) =>
                updateVideoTransform(clip.id, { height: Math.max(48, v) / refSize.height })
              }
              onReset={() => updateVideoTransform(clip.id, { height: 1 })}
            />
          </InspectorField>
          <InspectorField label="Rotation">
            <InspectorNumberField
              icon="°"
              value={clip.rotation ?? 0}
              min={-180}
              max={180}
              step={1}
              format={(v) => `${Math.round(v)}°`}
              isDefault={(clip.rotation ?? 0) === 0}
              onChange={(v) => updateVideoTransform(clip.id, { rotation: v })}
              onReset={() => updateVideoTransform(clip.id, { rotation: 0 })}
            />
          </InspectorField>
        </InspectorFields>
      </InspectorSection>
    ) : null;

  const blendingSection =
    clipKind === 'video' ? (
      <InspectorSection id={`${clip.id}-blending`} title="Blending" defaultOpen>
        <InspectorFields>
          <InspectorField label="Opacity">
            <InspectorNumberField
              icon={<Droplets size={12} />}
              value={clip.opacity ?? 1}
              min={0}
              max={1}
              step={0.01}
              scrubPixelsPerUnit={120}
              format={(v) => `${Math.round(v * 100)}%`}
              isDefault={(clip.opacity ?? 1) === 1}
              onChange={(v) => updateVideoTransform(clip.id, { opacity: v })}
              onReset={() => updateVideoTransform(clip.id, { opacity: 1 })}
            />
          </InspectorField>
        </InspectorFields>
      </InspectorSection>
    ) : null;

  const audioSection = (
    <InspectorSection
      id={`${clip.id}-audio`}
      title="Audio"
      summary={`${clipVolumePct}%`}
      defaultOpen
    >
      <InspectorFields>
        <InspectorField label="Volume">
          <InspectorNumberField
            icon={<Volume2 size={12} />}
            value={gainDbFromVolume(clipVolumeValue(clip))}
            min={GAIN_DB_MIN}
            max={GAIN_DB_MAX}
            step={0.5}
            format={(v) => (v <= GAIN_DB_MIN ? '-∞ dB' : `${v.toFixed(1)} dB`)}
            isDefault={Math.abs(gainDbFromVolume(clipVolumeValue(clip))) < 0.01}
            onChange={(v) => updateMediaClip(clip.id, { volume: volumeFromGainDb(v), muted: false })}
            onReset={() => updateMediaClip(clip.id, { volume: 1, muted: false })}
          />
        </InspectorField>
        {clipKind === 'video' && (
          <InspectorField label="Orig. mix">
            <InspectorNumberField
              icon="%"
              value={originalVolume}
              min={0}
              max={1}
              step={0.01}
              scrubPixelsPerUnit={120}
              format={(v) => `${Math.round(v * 100)}%`}
              isDefault={originalVolume === 1}
              onChange={(v) => setOriginalVolume(v)}
              onReset={() => setOriginalVolume(1)}
            />
          </InspectorField>
        )}
        {clipKind === 'audio' && (
          <InspectorField label={globalMixLabel}>
            <InspectorNumberField
              icon="%"
              value={globalMix}
              min={0}
              max={1}
              step={0.01}
              scrubPixelsPerUnit={120}
              format={(v) => `${Math.round(v * 100)}%`}
              isDefault={globalMix === 1}
              onChange={(v) => (isLinkedAudio ? setOriginalVolume(v) : setVoiceVolume(v))}
              onReset={() => (isLinkedAudio ? setOriginalVolume(1) : setVoiceVolume(1))}
            />
          </InspectorField>
        )}
      </InspectorFields>
      <AudioClipSettingsPanel
        clip={clip}
        onChange={(patch) => updateMediaClip(clip.id, patch)}
        globalMix={clipKind === 'video' ? originalVolume : globalMix}
        globalMixLabel={clipKind === 'audio' ? globalMixLabel : undefined}
        sourceLabel={clipKind === 'video' ? 'Embedded in video' : undefined}
      />
      {clipKind === 'video' && (
        <div className="clip-inspector-grid inspector-fields">
          <div className="clip-inspector-field">
            <span className="clip-inspector-field-label">Filter</span>
            <span className="clip-inspector-field-value font-mono">
              {projectEditor.videoFilterId ??
                (getVideoCssFilter() === 'none' ? 'None' : 'Custom')}
            </span>
          </div>
          <div className="clip-inspector-field">
            <span className="clip-inspector-field-label">Transition in</span>
            <span className="clip-inspector-field-value font-mono">
              {projectEditor.clipEdits[clip.id]?.transitionInId ?? 'None'}
            </span>
          </div>
          <div className="clip-inspector-field">
            <span className="clip-inspector-field-label">Transition out</span>
            <span className="clip-inspector-field-value font-mono">
              {projectEditor.clipEdits[clip.id]?.transitionOutId ?? 'None'}
            </span>
          </div>
        </div>
      )}
    </InspectorSection>
  );

  const speedSection = (
    <InspectorSection id={`${clip.id}-speed`} title="Speed" summary={`${(clip.speed ?? 1).toFixed(2)}×`} defaultOpen>
      <InspectorFields>
        <InspectorField label="Speed">
          <InspectorNumberField
            icon={<Gauge size={12} />}
            value={clip.speed ?? 1}
            min={0.25}
            max={4}
            step={0.05}
            scrubPixelsPerUnit={48}
            format={(v) => `${v.toFixed(2)}×`}
            isDefault={(clip.speed ?? 1) === 1}
            onChange={(v) => updateMediaClip(clip.id, { speed: v })}
            onReset={() => updateMediaClip(clip.id, { speed: 1 })}
          />
        </InspectorField>
        {clipKind === 'video' && (
          <>
            <InspectorField label="Fade in">
              <InspectorNumberField
                icon={<Clapperboard size={12} />}
                value={clip.videoFadeInSec ?? 0}
                min={0}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
                isDefault={(clip.videoFadeInSec ?? 0) === 0}
                onChange={(v) => updateMediaClip(clip.id, { videoFadeInSec: v })}
                onReset={() => updateMediaClip(clip.id, { videoFadeInSec: 0 })}
              />
            </InspectorField>
            <InspectorField label="Fade out">
              <InspectorNumberField
                icon={<Clapperboard size={12} />}
                value={clip.videoFadeOutSec ?? 0}
                min={0}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
                isDefault={(clip.videoFadeOutSec ?? 0) === 0}
                onChange={(v) => updateMediaClip(clip.id, { videoFadeOutSec: v })}
                onReset={() => updateMediaClip(clip.id, { videoFadeOutSec: 0 })}
              />
            </InspectorField>
          </>
        )}
      </InspectorFields>
      <div className="inspector-speed-presets">
        {[0.5, 1, 1.5, 2, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateMediaClip(clip.id, { speed: s })}
            className={cn(
              'inspector-speed-preset-btn',
              (clip.speed ?? 1) === s && 'is-active',
            )}
          >
            {s}×
          </button>
        ))}
      </div>
    </InspectorSection>
  );

  const voiceTabContent = (
    <div className="inspector-voice-tab">
      <div className="inspector-voice-categories">
        {(['filters', 'characters', 'song'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setVoiceCategory(cat)}
            className={cn('inspector-voice-category-btn', voiceCategory === cat && 'is-active')}
          >
            {cat === 'filters' ? String(t('voiceFilters')) : cat === 'characters' ? String(t('voiceCharacters')) : String(t('speechToSong'))}
          </button>
        ))}
      </div>
      <div className="inspector-voice-grid">
        {[
          { id: 'original', label: 'Original', pitch: 50, timbre: 50 },
          { id: 'echo', label: 'Echo', pitch: 50, timbre: 50, pro: true },
          { id: 'micHog', label: 'Mic Hog', pitch: 50, timbre: 50 },
          { id: 'micEcho', label: 'Mic Echo', pitch: 50, timbre: 50 },
          { id: 'high', label: 'High', pitch: 83, timbre: 33 },
          { id: 'low', label: 'Low', pitch: 25, timbre: 75 },
          { id: 'fullVoice', label: 'Full Voice', pitch: 60, timbre: 40 },
          { id: 'bassBoost', label: 'Bass Boost', pitch: 45, timbre: 55 },
        ].map((f) => {
          const active = (clip.voiceFilter || 'original') === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() =>
                updateMediaClip(clip.id, {
                  voiceFilter: f.id,
                  voicePitch: f.pitch,
                  voiceTimbre: f.timbre,
                })
              }
              className={cn('inspector-voice-preset', active && 'is-active')}
            >
              <span>{f.label}</span>
              {f.pro && <span className="inspector-voice-pro-dot" title="Pro effect" />}
            </button>
          );
        })}
      </div>
      <InspectorFields className="inspector-voice-adjustments">
        <InspectorField label={String(t('pitch'))}>
          <InspectorNumberField
            value={clip.voicePitch ?? 50}
            min={0}
            max={100}
            step={1}
            isDefault={(clip.voicePitch ?? 50) === 50}
            onChange={(v) => updateMediaClip(clip.id, { voicePitch: v })}
            onReset={() => updateMediaClip(clip.id, { voicePitch: 50 })}
          />
        </InspectorField>
        <InspectorField label={String(t('timbre'))}>
          <InspectorNumberField
            value={clip.voiceTimbre ?? 50}
            min={0}
            max={100}
            step={1}
            isDefault={(clip.voiceTimbre ?? 50) === 50}
            onChange={(v) => updateMediaClip(clip.id, { voiceTimbre: v })}
            onReset={() => updateMediaClip(clip.id, { voiceTimbre: 50 })}
          />
        </InspectorField>
      </InspectorFields>
    </div>
  );

  const eqSection = (
    <InspectorSection id={`${clip.id}-eq`} title="Equalizer" summary={clip.eq?.enabled ? 'On' : 'Off'} defaultOpen>
      <EqualizerEditor eq={clip.eq} onChange={(eq) => updateMediaClip(clip.id, { eq })} />
    </InspectorSection>
  );

  const actionsFooter = (
    <ClipActionsFooter
      clipKind={clipKind}
      clipId={clip.id}
      trackId={trackId}
      muted={muted}
      clipMuted={clip.muted}
    />
  );

  if (clipKind === 'video') {
    const tab = videoTab as VideoTabId;
    return (
      <InspectorPropertiesShell
        title="Video clip"
        icon={<Icon size={14} className="text-accent" />}
        tabs={videoTabs}
        activeTabId={tab}
        onTabChange={setVideoTab}
        footer={actionsFooter}
      >
        {tab === 'transform' && (
          <>
            {clipInfoSection}
            {transformSection}
          </>
        )}
        {tab === 'blending' && blendingSection}
        {tab === 'audio' && audioSection}
        {tab === 'speed' && speedSection}
        {tab === 'background' && (
          <CompositionBackgroundPanel
            background={clipBackground}
            onChange={(patch) => updateClipBackground(clip.id, patch)}
            showApplyToAll
            onApplyToAll={() => applyBackgroundToAllVideoClips(clipBackground)}
          />
        )}
        {tab === 'voice' && voiceTabContent}
      </InspectorPropertiesShell>
    );
  }

  const tab = audioTab as AudioTabId;
  return (
    <InspectorPropertiesShell
      title="Audio clip"
      icon={<Icon size={14} className="text-accent" />}
      tabs={audioTabs}
      activeTabId={tab}
      onTabChange={setAudioTab}
      footer={actionsFooter}
    >
      {tab === 'clip' && clipInfoSection}
      {tab === 'audio' && audioSection}
      {tab === 'eq' && eqSection}
    </InspectorPropertiesShell>
  );
}
