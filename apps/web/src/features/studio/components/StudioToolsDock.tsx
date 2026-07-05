import type { RefObject } from 'react';
import {
  Mic2,
  Languages,
  Loader2,
  BookOpen,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useTranslation } from '@/features/settings';
import { LANGUAGES } from '@/features/translation/constants/languages';
import { VOICES } from '@/features/translation/constants/voices';
import { Label, Select, StudioIcon } from '@vokop/ui';
import { AssetIcon, type AssetIconName } from '@/assets/support';
import { InspectorSection } from '@/features/studio/components/InspectorSection';
import { AudioMixWaveforms } from '@/features/studio/components/AudioMixWaveforms';
import { MediaLibraryPanel } from '@/features/studio/components/MediaLibraryPanel';
import { TextTemplatesPanel } from '@/features/studio/components/TextTemplatesPanel';
import { EditorPresetGrid } from '@/features/studio/components/EditorPresetGrid';
import { TransitionsPanel } from '@/features/studio/components/TransitionsPanel';
import { FiltersPanel } from '@/features/studio/components/FiltersPanel';
import { EffectsPanel } from '@/features/studio/components/EffectsPanel';
import { AutoCaptionsPanel } from '@/features/studio/components/AutoCaptionsPanel';
import { BeatCutPanel } from '@/features/studio/components/BeatCutPanel';
import { useEditorCatalog } from '@/features/studio/hooks/useEditorCatalog';
import { useEditorActions } from '@/features/studio/hooks/useEditorActions';
import { useSidePanelSplit } from '@/features/studio/hooks/useSidePanelSplit';
import type { StudioToolId } from '@/types';

const LEFT_PANEL_MIN = 220;
const LEFT_PANEL_MAX = 420;
const LEFT_PANEL_DEFAULT = 264;

interface StudioToolsDockProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onPreviewVoice: (speaker: string) => void;
  onRegenerateVoiceover?: () => void;
}

const TOOLS: { id: StudioToolId; label: string; titleKey: string; icon: AssetIconName }[] = [
  { id: 'media', label: 'Media', titleKey: 'studioToolMedia', icon: 'images' },
  { id: 'text', label: 'Text', titleKey: 'studioToolText', icon: 'text' },
  { id: 'audio', label: 'Audio', titleKey: 'studioToolAudio', icon: 'audio' },
  { id: 'voice', label: 'Voice', titleKey: 'studioToolVoice', icon: 'audio' },
  { id: 'captions', label: 'Captions', titleKey: 'studioToolCaptions', icon: 'text' },
  { id: 'effects', label: 'Effects', titleKey: 'studioToolEffects', icon: 'effect' },
  { id: 'transitions', label: 'Transitions', titleKey: 'studioToolTransitions', icon: 'transition' },
  { id: 'filters', label: 'Filters', titleKey: 'studioToolFilters', icon: 'ease' },
];

function ToolsScroll({ children }: { children: React.ReactNode }) {
  return <div className="tools-panel-scroll studio-scrollbar">{children}</div>;
}

export function StudioToolsDock({ videoRef, onPreviewVoice, onRegenerateVoiceover }: StudioToolsDockProps) {
  const { t } = useTranslation();
  const toolsDrawerOpen = useAppStore((s) => s.toolsDrawerOpen);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);
  const activeStudioTool = useAppStore((s) => s.activeStudioTool);
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);
  const {
    width: panelWidth,
    minWidth,
    maxWidth,
    dragging: splitDragging,
    splitterProps,
  } = useSidePanelSplit({
    storageKey: 'vokop-left-panel-width',
    defaultWidth: LEFT_PANEL_DEFAULT,
    minWidth: LEFT_PANEL_MIN,
    maxWidth: LEFT_PANEL_MAX,
    edge: 'left',
  });

  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const originalVolume = useAppStore((s) => s.originalVolume);
  const setOriginalVolume = useAppStore((s) => s.setOriginalVolume);
  const voiceVolume = useAppStore((s) => s.voiceVolume);
  const setVoiceVolume = useAppStore((s) => s.setVoiceVolume);
  const targetLang = useAppStore((s) => s.targetLang);
  const setTargetLang = useAppStore((s) => s.setTargetLang);
  const selectedVoice = useAppStore((s) => s.selectedVoice);
  const setSelectedVoice = useAppStore((s) => s.setSelectedVoice);
  const detectedSpeakers = useAppStore((s) => s.detectedSpeakers);
  const speakerVoices = useAppStore((s) => s.speakerVoices);
  const updateSpeakerVoice = useAppStore((s) => s.updateSpeakerVoice);
  const previewingSpeaker = useAppStore((s) => s.previewingSpeaker);
  const translatedText = useAppStore((s) => s.translatedText);
  const status = useAppStore((s) => s.status);
  const videoAnalysis = useAppStore((s) => s.videoAnalysis);
  const projectEditor = useAppStore((s) => s.projectEditor);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const videoClips = useAppStore((s) => s.videoClips);
  const setTransitionDuration = useAppStore((s) => s.setTransitionDuration);

  const { catalog } = useEditorCatalog();
  const { applyPreset, applying } = useEditorActions();

  const presetsFor = (tool: StudioToolId) =>
    catalog.find((entry) => entry.id === tool)?.presets ?? [];

  const selectTool = (tool: StudioToolId) => {
    if (activeStudioTool === tool && toolsDrawerOpen) {
      setToolsDrawerOpen(false);
    } else {
      setActiveStudioTool(tool);
      setToolsDrawerOpen(true);
    }
  };

  const openSubtitleEditor = () => {
    setActiveTab('translate');
    setEditorOpen(true);
  };

  const activeTool = TOOLS.find((t) => t.id === activeStudioTool);
  const activeLabel = activeTool ? t(activeTool.titleKey as any) : '';

  return (
    <aside className="studio-tools-dock" aria-label="Editing tools">
      <div className="studio-tools-rail">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            title={t(tool.titleKey as any)}
            onClick={() => selectTool(tool.id)}
            className={cn(
              'studio-tools-rail-btn',
              activeStudioTool === tool.id && toolsDrawerOpen && 'active',
            )}
          >
            <AssetIcon name={tool.icon} size={20} className="studio-tools-rail-asset-icon" />
            <span className="studio-tools-rail-label">{t(tool.titleKey as any)}</span>
          </button>
        ))}
      </div>

      {toolsDrawerOpen && (
        <>
          <div className="studio-tools-panel" style={{ width: panelWidth }}>
            <div className="studio-tools-panel-titlebar">
              <span className="studio-tools-panel-title">{activeLabel}</span>
            </div>

            <div className="studio-tools-panel-body">
              {activeStudioTool === 'media' && <MediaLibraryPanel />}

              {activeStudioTool === 'text' && <TextTemplatesPanel />}

              {activeStudioTool === 'audio' && (
                <ToolsScroll>
                  <InspectorSection
                    id="tools-audio-presets"
                    title="Quick mix"
                    icon={<StudioIcon name="volume" size={12} />}
                    defaultOpen
                  >
                    <EditorPresetGrid
                      presets={presetsFor('audio')}
                      disabled={applying}
                      onSelect={(id) => void applyPreset('audio', id)}
                    />
                  </InspectorSection>

                  <InspectorSection
                    id="tools-audio-beat-cut"
                    title="Beat sync / auto-cut"
                    icon={<StudioIcon name="volume" size={12} />}
                    defaultOpen
                  >
                    <BeatCutPanel />
                  </InspectorSection>

                  <InspectorSection
                    id="tools-audio-waveform"
                    title="Waveform"
                    icon={<StudioIcon name="volume" size={12} />}
                    defaultOpen
                  >
                    <AudioMixWaveforms videoRef={videoRef} />
                  </InspectorSection>

                  <InspectorSection
                    id="tools-audio-levels"
                    title="Mix levels"
                    icon={<StudioIcon name="sliders" size={12} />}
                    summary={`${Math.round(originalVolume * 100)}% / ${Math.round(voiceVolume * 100)}%`}
                    defaultOpen
                  >
                    <div className="tools-vol-row">
                      <div className="tools-vol-icon">
                        {originalVolume === 0 ? (
                          <VolumeX size={14} />
                        ) : originalVolume < 0.5 ? (
                          <Volume1 size={14} />
                        ) : (
                          <Volume2 size={14} />
                        )}
                      </div>
                      <div className="tools-vol-body">
                        <div className="tools-vol-head">
                          <span>Original audio</span>
                          <span className="tools-vol-value">{Math.round(originalVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={originalVolume}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setOriginalVolume(v);
                            if (videoRef.current) videoRef.current.volume = v;
                          }}
                          className="tools-vol-slider"
                        />
                        <div className="tools-vol-presets">
                          {[0, 25, 50, 75, 100].map((p) => (
                            <button
                              key={p}
                              type="button"
                              className={cn(
                                'tools-vol-preset',
                                Math.round(originalVolume * 100) === p && 'active',
                              )}
                              onClick={() => {
                                const v = p / 100;
                                setOriginalVolume(v);
                                if (videoRef.current) videoRef.current.volume = v;
                              }}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="tools-vol-row">
                      <div className="tools-vol-icon text-accent">
                        <Mic2 size={14} />
                      </div>
                      <div className="tools-vol-body">
                        <div className="tools-vol-head">
                          <span>AI voiceover</span>
                          <span className="tools-vol-value">{Math.round(voiceVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={2}
                          step={0.05}
                          value={voiceVolume}
                          onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                          className="tools-vol-slider"
                          style={
                            { '--vol-pct': `${(voiceVolume / 2) * 100}%` } as React.CSSProperties
                          }
                        />
                        <div className="tools-vol-presets">
                          {[0, 50, 100, 150, 200].map((p) => (
                            <button
                              key={p}
                              type="button"
                              className={cn(
                                'tools-vol-preset',
                                Math.round(voiceVolume * 100) === p && 'active',
                              )}
                              onClick={() => setVoiceVolume(p / 100)}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </InspectorSection>
                </ToolsScroll>
              )}

              {activeStudioTool === 'voice' && (
                <ToolsScroll>
                  {videoAnalysis && (
                    <InspectorSection
                      id="tools-voice-summary"
                      title="Movie summary"
                      icon={<BookOpen size={12} />}
                      defaultOpen={false}
                    >
                      <p className="tools-summary-text">{videoAnalysis.summary}</p>
                      {videoAnalysis.highlights?.length > 0 && (
                        <div className="tools-highlights">
                          <p className="tools-highlights-head">Key moments</p>
                          {videoAnalysis.highlights.map((h, i) => (
                            <div key={i} className="tools-highlight-row">
                              <span className="tools-highlight-time">
                                {h.start}–{h.end}
                              </span>
                              <span className="tools-highlight-text">{h.narration}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </InspectorSection>
                  )}

                  <InspectorSection
                    id="tools-voice-lang"
                    title="Language & voice"
                    icon={<Languages size={12} />}
                    summary={targetLang}
                    defaultOpen
                  >
                    <div className="space-y-1.5">
                      <Label>Language</Label>
                      <Select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code} className="bg-[var(--surface)]">
                            {lang.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Narrator</Label>
                      <Select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                      >
                        {VOICES.map((v) => (
                          <option key={v.id} value={v.id} className="bg-[var(--surface)]">
                            {v.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </InspectorSection>

                  {translatedText && onRegenerateVoiceover && (
                    <InspectorSection
                      id="tools-voice-regen"
                      title="Voiceover"
                      icon={<Mic2 size={12} />}
                      defaultOpen
                    >
                      <button
                        type="button"
                        onClick={onRegenerateVoiceover}
                        disabled={status !== 'idle'}
                        className="studio-tools-action-btn w-full"
                      >
                        {status === 'speaking' ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Mic2 size={14} />
                        )}
                        Regenerate voiceover
                      </button>
                    </InspectorSection>
                  )}

                  {detectedSpeakers.length > 0 && (
                    <InspectorSection
                      id="tools-voice-speakers"
                      title={`Speakers (${detectedSpeakers.length})`}
                      icon={<Mic2 size={12} />}
                      defaultOpen
                    >
                      <div className="space-y-2">
                        {detectedSpeakers.map((speaker) => (
                          <div key={speaker} className="tools-speaker-row">
                            <div className="tools-speaker-head">
                              <span className="tools-speaker-name">{speaker}</span>
                              <button
                                type="button"
                                onClick={() => onPreviewVoice(speaker)}
                                disabled={previewingSpeaker !== null}
                                className="tools-speaker-preview-btn"
                                title="Preview voice"
                              >
                                {previewingSpeaker === speaker ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Mic2 size={12} />
                                )}
                              </button>
                            </div>
                            <Select
                              value={speakerVoices[speaker] || 'Kore'}
                              onChange={(e) => updateSpeakerVoice(speaker, e.target.value)}
                              className="text-[11px]"
                            >
                              {VOICES.map((v) => (
                                <option
                                  key={v.id}
                                  value={v.id}
                                  className="bg-[var(--surface)]"
                                >
                                  {v.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ))}
                      </div>
                    </InspectorSection>
                  )}
                </ToolsScroll>
              )}

              {activeStudioTool === 'captions' && (
                <ToolsScroll>
                  <InspectorSection
                    id="tools-captions-generate"
                    title="Auto captions"
                    icon={<StudioIcon name="text" size={12} />}
                    defaultOpen
                  >
                    <AutoCaptionsPanel />
                  </InspectorSection>
                  <InspectorSection
                    id="tools-captions-style"
                    title="Caption style"
                    icon={<StudioIcon name="timeline" size={12} />}
                    defaultOpen
                  >
                    <EditorPresetGrid
                      presets={presetsFor('captions')}
                      activeId={projectEditor.captionStyle}
                      disabled={applying}
                      onSelect={(id) => void applyPreset('captions', id)}
                    />
                  </InspectorSection>
                  <InspectorSection
                    id="tools-captions-subs"
                    title="Subtitles"
                    icon={<StudioIcon name="timeline" size={12} />}
                    defaultOpen
                  >
                    <button
                      type="button"
                      onClick={openSubtitleEditor}
                      className="studio-tools-action-btn w-full"
                    >
                      Open subtitle editor <StudioIcon name="arrowRight" size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('transcript');
                        setEditorOpen(true);
                      }}
                      className="studio-tools-action-btn w-full"
                    >
                      View transcript <StudioIcon name="arrowRight" size={13} />
                    </button>
                  </InspectorSection>
                </ToolsScroll>
              )}

              {activeStudioTool === 'effects' && (
                <ToolsScroll>
                  <EffectsPanel
                    activeId={
                      selectedTimelineClip
                        ? projectEditor.clipEdits[selectedTimelineClip.clipId]?.effectId
                        : null
                    }
                    disabled={applying}
                    onSelect={(id) => void applyPreset('effects', id)}
                  />
                </ToolsScroll>
              )}

              {activeStudioTool === 'transitions' && (
                <ToolsScroll>
                  <TransitionsPanel
                    presets={presetsFor('transitions')}
                    activeId={
                      selectedTimelineClip
                        ? projectEditor.clipEdits[selectedTimelineClip.clipId]?.transitionInId
                        : null
                    }
                    disabled={applying}
                    clipSelected={Boolean(selectedTimelineClip)}
                    selectedClipId={selectedTimelineClip?.clipId ?? null}
                    videoClips={videoClips}
                    timelineTransitions={projectEditor.timelineTransitions}
                    onDurationChange={setTransitionDuration}
                    onSelect={(id) => void applyPreset('transitions', id)}
                  />
                </ToolsScroll>
              )}

              {activeStudioTool === 'filters' && (
                <ToolsScroll>
                  <FiltersPanel
                    presets={presetsFor('filters')}
                    activeId={projectEditor.videoFilterId ?? 'original'}
                    disabled={applying}
                    onSelect={(id) => void applyPreset('filters', id)}
                  />
                </ToolsScroll>
              )}
            </div>
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize tools panel"
            aria-valuenow={Math.round(panelWidth)}
            aria-valuemin={minWidth}
            aria-valuemax={maxWidth}
            className={cn('studio-side-splitter', splitDragging && 'is-dragging')}
            {...splitterProps}
          >
            <span className="studio-side-splitter-grip" aria-hidden>
              <span className="studio-side-splitter-pill studio-side-splitter-pill--accent" />
              <span className="studio-side-splitter-thumb" />
              <span className="studio-side-splitter-pill studio-side-splitter-pill--muted" />
            </span>
          </div>
        </>
      )}
    </aside>
  );
}
