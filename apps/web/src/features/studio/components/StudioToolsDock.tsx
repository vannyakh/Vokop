import type { RefObject } from 'react';
import {
  Film,
  Type,
  Music2,
  Mic2,
  Subtitles,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Languages,
  Loader2,
  ChevronRight,
  Stamp,
  BookOpen,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { LANGUAGES } from '@/features/translation/constants/languages';
import { VOICES } from '@/features/translation/constants/voices';
import { Label, Select } from '@vokop/ui';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import { AudioMixWaveforms } from '@/features/studio/components/AudioMixWaveforms';
import { CanvasElementPanel, CanvasFrameAssetsPanel } from '@/features/studio/components/CanvasElementPanel';
import { PixabayMediaPanel } from '@/features/studio/components/PixabayMediaPanel';
import { MediaLibraryPanel } from '@/features/studio/components/MediaLibraryPanel';
import { TextTemplatesPanel } from '@/features/studio/components/TextTemplatesPanel';
import { StickersPanel } from '@/features/studio/components/StickersPanel';
import { EditorPresetGrid } from '@/features/studio/components/EditorPresetGrid';
import { useEditorCatalog } from '@/features/studio/hooks/useEditorCatalog';
import { useEditorActions } from '@/features/studio/hooks/useEditorActions';
import type { StudioToolId } from '@/types';

interface StudioToolsDockProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onPreviewVoice: (speaker: string) => void;
  onRegenerateVoiceover?: () => void;
}

const TOOLS: { id: StudioToolId; label: string; icon: React.ElementType }[] = [
  { id: 'media',       label: 'Media',       icon: Film },
  { id: 'text',        label: 'Text',        icon: Type },
  { id: 'audio',       label: 'Audio',       icon: Music2 },
  { id: 'voice',       label: 'Voice',       icon: Mic2 },
  { id: 'captions',    label: 'Captions',    icon: Subtitles },
  { id: 'effects',     label: 'Effects',     icon: Sparkles },
  { id: 'transitions', label: 'Transitions', icon: Layers },
  { id: 'filters',     label: 'Filters',     icon: SlidersHorizontal },
];

export function StudioToolsDock({ videoRef, onPreviewVoice, onRegenerateVoiceover }: StudioToolsDockProps) {
  const toolsDrawerOpen = useAppStore((s) => s.toolsDrawerOpen);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);
  const activeStudioTool = useAppStore((s) => s.activeStudioTool);
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);

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

  return (
    <aside className="studio-tools-dock" aria-label="Editing tools">
      {/* ── Vertical icon rail ── */}
      <div className="studio-tools-rail">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              title={tool.label}
              onClick={() => selectTool(tool.id)}
              className={cn('studio-tools-rail-btn', activeStudioTool === tool.id && toolsDrawerOpen && 'active')}
            >
              <Icon size={20} strokeWidth={1.6} />
              <span className="studio-tools-rail-label">{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Slide-out panel ── */}
      {toolsDrawerOpen && (
        <div className="studio-tools-panel">
          <div className="studio-tools-panel-titlebar">
            <span className="studio-tools-panel-title">
              {TOOLS.find((t) => t.id === activeStudioTool)?.label}
            </span>
          </div>

          <div className="studio-tools-panel-body studio-scrollbar">

            {/* ── MEDIA ── */}
            {activeStudioTool === 'media' && (
              <div className="tools-section-stack">
                <MediaLibraryPanel />
                <PixabayMediaPanel />
              </div>
            )}

            {/* ── TEXT ── */}
            {activeStudioTool === 'text' && (
              <div className="tools-section-stack">
                <StudioPanel title="Add text" icon={<Type size={12} className="text-accent" />}>
                  <TextTemplatesPanel />
                </StudioPanel>
                <CanvasElementPanel />
              </div>
            )}

            {/* ── AUDIO ── */}
            {activeStudioTool === 'audio' && (
              <div className="tools-section-stack">
                <StudioPanel title="Quick mix" icon={<Music2 size={12} className="text-accent" />}>
                  <EditorPresetGrid
                    presets={presetsFor('audio')}
                    disabled={applying}
                    onSelect={(id) => void applyPreset('audio', id)}
                  />
                </StudioPanel>

                <StudioPanel title="Waveform" icon={<Music2 size={12} className="text-accent" />}>
                  <AudioMixWaveforms videoRef={videoRef} />
                </StudioPanel>

                <StudioPanel title="Mix levels" icon={<SlidersHorizontal size={12} className="text-accent" />}>
                  <div className="space-y-5">
                    {/* Original volume */}
                    <div className="tools-vol-row">
                      <div className="tools-vol-icon">
                        {originalVolume === 0 ? <VolumeX size={14} /> : originalVolume < 0.5 ? <Volume1 size={14} /> : <Volume2 size={14} />}
                      </div>
                      <div className="tools-vol-body">
                        <div className="tools-vol-head">
                          <span>Original audio</span>
                          <span className="tools-vol-value">{Math.round(originalVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0} max={1} step={0.05}
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
                            <button key={p} type="button"
                              className={cn('tools-vol-preset', Math.round(originalVolume * 100) === p && 'active')}
                              onClick={() => { const v = p / 100; setOriginalVolume(v); if (videoRef.current) videoRef.current.volume = v; }}>
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* AI voice volume */}
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
                          min={0} max={2} step={0.05}
                          value={voiceVolume}
                          onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                          className="tools-vol-slider"
                          style={{ '--vol-pct': `${(voiceVolume / 2) * 100}%` } as React.CSSProperties}
                        />
                        <div className="tools-vol-presets">
                          {[0, 50, 100, 150, 200].map((p) => (
                            <button key={p} type="button"
                              className={cn('tools-vol-preset', Math.round(voiceVolume * 100) === p && 'active')}
                              onClick={() => setVoiceVolume(p / 100)}>
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </StudioPanel>
              </div>
            )}

            {/* ── VOICE ── */}
            {activeStudioTool === 'voice' && (
              <div className="tools-section-stack">
                {/* AI Summary */}
                {videoAnalysis && (
                  <StudioPanel title="Movie summary" icon={<BookOpen size={12} className="text-accent" />}>
                    <p className="tools-summary-text">{videoAnalysis.summary}</p>
                    {videoAnalysis.highlights?.length > 0 && (
                      <div className="tools-highlights">
                        <p className="tools-highlights-head">Key moments</p>
                        {videoAnalysis.highlights.map((h, i) => (
                          <div key={i} className="tools-highlight-row">
                            <span className="tools-highlight-time">{h.start}–{h.end}</span>
                            <span className="tools-highlight-text">{h.narration}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </StudioPanel>
                )}

                <StudioPanel title="Language & Voice" icon={<Languages size={12} className="text-accent" />}>
                  <div className="space-y-3">
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
                      <Select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                        {VOICES.map((v) => (
                          <option key={v.id} value={v.id} className="bg-[var(--surface)]">
                            {v.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </StudioPanel>

                {translatedText && onRegenerateVoiceover && (
                  <StudioPanel title="Voiceover" icon={<Mic2 size={12} className="text-accent" />}>
                    <button
                      type="button"
                      onClick={onRegenerateVoiceover}
                      disabled={status !== 'idle'}
                      className="studio-tools-action-btn w-full"
                    >
                      {status === 'speaking' ? <Loader2 size={14} className="animate-spin" /> : <Mic2 size={14} />}
                      Regenerate voiceover
                    </button>
                  </StudioPanel>
                )}

                {detectedSpeakers.length > 0 && (
                  <StudioPanel title={`Speakers (${detectedSpeakers.length})`} icon={<Mic2 size={12} className="text-accent" />}>
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
                              {previewingSpeaker === speaker
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Mic2 size={12} />}
                            </button>
                          </div>
                          <Select
                            value={speakerVoices[speaker] || 'Kore'}
                            onChange={(e) => updateSpeakerVoice(speaker, e.target.value)}
                            className="text-[11px]"
                          >
                            {VOICES.map((v) => (
                              <option key={v.id} value={v.id} className="bg-[var(--surface)]">{v.label}</option>
                            ))}
                          </Select>
                        </div>
                      ))}
                    </div>
                  </StudioPanel>
                )}
              </div>
            )}

            {/* ── CAPTIONS ── */}
            {activeStudioTool === 'captions' && (
              <div className="tools-section-stack">
                <StudioPanel title="Caption style" icon={<Subtitles size={12} className="text-accent" />}>
                  <EditorPresetGrid
                    presets={presetsFor('captions')}
                    activeId={projectEditor.captionStyle}
                    disabled={applying}
                    onSelect={(id) => void applyPreset('captions', id)}
                  />
                </StudioPanel>
                <StudioPanel title="Subtitles" icon={<Subtitles size={12} className="text-accent" />}>
                  <div className="space-y-2">
                    <button type="button" onClick={openSubtitleEditor} className="studio-tools-action-btn w-full">
                      Open subtitle editor <ChevronRight size={13} />
                    </button>
                    <button type="button" onClick={() => { setActiveTab('transcript'); setEditorOpen(true); }} className="studio-tools-action-btn w-full">
                      View transcript <ChevronRight size={13} />
                    </button>
                  </div>
                </StudioPanel>
                <CanvasElementPanel />
              </div>
            )}

            {/* ── STICKERS (Effects) ── */}
            {activeStudioTool === 'effects' && (
              <div className="tools-section-stack">
                <StudioPanel title="Video effects" icon={<Sparkles size={12} className="text-accent" />}>
                  <EditorPresetGrid
                    presets={presetsFor('effects')}
                    disabled={applying}
                    onSelect={(id) => void applyPreset('effects', id)}
                  />
                </StudioPanel>
                <StudioPanel title="Stickers" icon={<Stamp size={12} className="text-accent" />}>
                  <StickersPanel />
                </StudioPanel>
                <CanvasElementPanel />
              </div>
            )}

            {/* ── TRANSITIONS ── */}
            {activeStudioTool === 'transitions' && (
              <div className="tools-section-stack">
                <StudioPanel title="Transitions" icon={<Layers size={12} className="text-accent" />}>
                  {selectedTimelineClip ? (
                    <EditorPresetGrid
                      presets={presetsFor('transitions')}
                      activeId={projectEditor.clipEdits[selectedTimelineClip.clipId]?.transitionInId}
                      disabled={applying}
                      onSelect={(id) => void applyPreset('transitions', id)}
                    />
                  ) : (
                    <p className="tools-coming-soon-label">Select a timeline clip to apply a transition</p>
                  )}
                </StudioPanel>
              </div>
            )}

            {/* ── FILTERS ── */}
            {activeStudioTool === 'filters' && (
              <div className="tools-section-stack">
                <StudioPanel title="Color filters" icon={<SlidersHorizontal size={12} className="text-accent" />}>
                  <EditorPresetGrid
                    presets={presetsFor('filters')}
                    activeId={projectEditor.videoFilterId ?? 'original'}
                    disabled={applying}
                    onSelect={(id) => void applyPreset('filters', id)}
                  />
                </StudioPanel>
              </div>
            )}

          </div>
        </div>
      )}
    </aside>
  );
}
