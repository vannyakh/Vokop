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
  Check,
  Languages,
  Loader2,
  ChevronRight,
  ImageIcon,
  Stamp,
  BookOpen,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { ASPECT_RATIOS } from '@/features/studio/constants/aspectRatios';
import { LANGUAGES } from '@/features/translation/constants/languages';
import { VOICES } from '@/features/translation/constants/voices';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import { AudioMixWaveforms } from '@/features/studio/components/AudioMixWaveforms';
import { CanvasElementPanel, CanvasFrameAssetsPanel } from '@/features/studio/components/CanvasElementPanel';
import { PixabayMediaPanel } from '@/features/studio/components/PixabayMediaPanel';
import { TextTemplatesPanel } from '@/features/studio/components/TextTemplatesPanel';
import { StickersPanel } from '@/features/studio/components/StickersPanel';
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

// ── Placeholder chip grid for Transitions / Filters ─────────────────────────
const TRANSITION_CHIPS = ['Cut', 'Dissolve', 'Wipe', 'Slide', 'Zoom', 'Flash', 'Spin', 'Blur'];
const FILTER_CHIPS = ['Vivid', 'Matte', 'Cinematic', 'Vintage', 'B&W', 'Warm', 'Cool', 'Drama'];

function PresetGrid({ items }: { items: string[] }) {
  return (
    <div className="tools-preset-grid">
      {items.map((label) => (
        <button key={label} type="button" className="tools-preset-chip" disabled>
          <span className="tools-preset-chip-preview" />
          <span className="tools-preset-chip-label">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function StudioToolsDock({ videoRef, onPreviewVoice, onRegenerateVoiceover }: StudioToolsDockProps) {
  const toolsDrawerOpen = useAppStore((s) => s.toolsDrawerOpen);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);
  const activeStudioTool = useAppStore((s) => s.activeStudioTool);
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);

  const videoFile = useAppStore((s) => s.videoFile);
  const duration = useAppStore((s) => s.duration);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const setAspectRatio = useAppStore((s) => s.setAspectRatio);
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
  const addCanvasLogo = useAppStore((s) => s.addCanvasLogo);
  const addCanvasImageOverlay = useAppStore((s) => s.addCanvasImageOverlay);
  const videoAnalysis = useAppStore((s) => s.videoAnalysis);

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
                <PixabayMediaPanel />

                {/* Local assets */}
                <StudioPanel title="Local assets" icon={<Film size={12} className="text-accent" />}>
                  <div className="space-y-2">
                    <input
                      id="logo-pick"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) addCanvasLogo(f); e.target.value = ''; }}
                    />
                    <input
                      id="overlay-pick"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) addCanvasImageOverlay(f); e.target.value = ''; }}
                    />
                    <button type="button" onClick={() => document.getElementById('logo-pick')?.click()} className="studio-tools-action-btn w-full">
                      <Stamp size={13} /> Add logo
                    </button>
                    <button type="button" onClick={() => document.getElementById('overlay-pick')?.click()} className="studio-tools-action-btn w-full">
                      <ImageIcon size={13} /> Add image overlay
                    </button>
                  </div>
                  {videoFile && (
                    <div className="tools-media-meta">
                      <span className="truncate" title={videoFile.name}>{videoFile.name}</span>
                      <span className="tools-media-meta-chips">
                        {videoWidth > 0 && <span>{videoWidth}×{videoHeight}</span>}
                        {duration > 0 && <span>{formatStudioTimecode(duration)}</span>}
                        <span>{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                      </span>
                    </div>
                  )}
                </StudioPanel>

                {/* Canvas ratio */}
                <StudioPanel title="Canvas ratio" icon={<Film size={12} className="text-accent" />}>
                  <div className="studio-tools-ratio-grid">
                    {ASPECT_RATIOS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setAspectRatio(option.id)}
                        className={cn('studio-tools-ratio-chip', aspectRatio === option.id && 'active')}
                      >
                        <span className="studio-header-ratio-icon" data-ratio={option.id} />
                        <span className="studio-tools-ratio-chip-label">{option.label}</span>
                        {aspectRatio === option.id && <Check size={11} className="text-accent" />}
                      </button>
                    ))}
                  </div>
                </StudioPanel>
              </div>
            )}

            {/* ── TEXT ── */}
            {activeStudioTool === 'text' && (
              <div className="tools-section-stack">
                <TextTemplatesPanel />
                <CanvasElementPanel />
              </div>
            )}

            {/* ── AUDIO ── */}
            {activeStudioTool === 'audio' && (
              <div className="tools-section-stack">
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
                  <p className="tools-coming-soon-label">Coming soon</p>
                  <PresetGrid items={TRANSITION_CHIPS} />
                </StudioPanel>
              </div>
            )}

            {/* ── FILTERS ── */}
            {activeStudioTool === 'filters' && (
              <div className="tools-section-stack">
                <StudioPanel title="Color filters" icon={<SlidersHorizontal size={12} className="text-accent" />}>
                  <p className="tools-coming-soon-label">Coming soon</p>
                  <PresetGrid items={FILTER_CHIPS} />
                </StudioPanel>
              </div>
            )}

          </div>
        </div>
      )}
    </aside>
  );
}
