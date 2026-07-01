import type { RefObject } from 'react';
import {
  Film,
  Type,
  Volume2,
  Mic2,
  LayoutPanelLeft,
  Check,
  Languages,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { ASPECT_RATIOS } from '@/features/studio/constants/aspectRatios';
import { LANGUAGES } from '@/features/translation/constants/languages';
import { VOICES } from '@/features/translation/constants/voices';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import { AudioMixWaveforms } from '@/features/studio/components/AudioMixWaveforms';
import { CanvasElementPanel, CanvasFrameAssetsPanel } from '@/features/studio/components/CanvasElementPanel';
import type { StudioToolId } from '@/types';

interface StudioToolsDockProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onPreviewVoice: (speaker: string) => void;
}

const TOOLS: { id: StudioToolId; label: string; icon: typeof Film }[] = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'sound', label: 'Sound', icon: Volume2 },
  { id: 'voice', label: 'Voice', icon: Mic2 },
];

export function StudioToolsDock({ videoRef, onPreviewVoice }: StudioToolsDockProps) {
  const toolsDrawerOpen = useAppStore((s) => s.toolsDrawerOpen);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);
  const toggleToolsDrawer = useAppStore((s) => s.toggleToolsDrawer);
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

  const selectTool = (tool: StudioToolId) => {
    setActiveStudioTool(tool);
    if (!toolsDrawerOpen) setToolsDrawerOpen(true);
  };

  const openSubtitleEditor = () => {
    setActiveTab('translate');
    setEditorOpen(true);
  };

  return (
    <aside className="studio-tools-dock" aria-label="Editing tools">
      <div className="studio-tools-rail">
        <button
          type="button"
          onClick={() => toggleToolsDrawer()}
          className={cn('studio-tools-rail-toggle', toolsDrawerOpen && 'active')}
          title={toolsDrawerOpen ? 'Collapse tools panel' : 'Expand tools panel'}
          aria-expanded={toolsDrawerOpen}
        >
          <LayoutPanelLeft size={18} strokeWidth={1.75} />
        </button>

        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              title={tool.label}
              onClick={() => selectTool(tool.id)}
              className={cn('studio-tools-rail-btn', activeStudioTool === tool.id && 'active')}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="studio-tools-rail-label">{tool.label}</span>
            </button>
          );
        })}
      </div>

      {toolsDrawerOpen && (
        <div className="studio-tools-panel">
          <div className="studio-tools-panel-head">
            <div>
              <p className="studio-tools-panel-eyebrow">Tools</p>
              <h2 className="studio-tools-panel-title">
                {TOOLS.find((t) => t.id === activeStudioTool)?.label}
              </h2>
            </div>
          </div>

          <div className="studio-tools-panel-body studio-scrollbar">
            {activeStudioTool === 'media' && (
              <div className="space-y-3">
                <CanvasFrameAssetsPanel />
                <CanvasElementPanel />
                  <StudioPanel title="Video" icon={<Film size={12} className="text-accent" />}>
                    {videoFile ? (
                      <div className="space-y-2 text-xs text-muted">
                        <p className="font-medium text-[var(--text)] truncate" title={videoFile.name}>
                          {videoFile.name}
                        </p>
                        <div className="flex flex-wrap gap-2 font-mono text-[10px] text-faint">
                          {videoWidth > 0 && (
                            <span>
                              {videoWidth}×{videoHeight}
                            </span>
                          )}
                          {duration > 0 && <span>{formatStudioTimecode(duration)}</span>}
                          <span>{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-faint">No media loaded</p>
                    )}
                  </StudioPanel>

                  <StudioPanel title="Canvas ratio" icon={<Film size={12} className="text-accent" />}>
                    <div className="studio-tools-ratio-grid">
                      {ASPECT_RATIOS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setAspectRatio(option.id)}
                          className={cn(
                            'studio-tools-ratio-chip',
                            aspectRatio === option.id && 'active',
                          )}
                        >
                          <span className="studio-header-ratio-icon" data-ratio={option.id} />
                          <span className="studio-tools-ratio-chip-label">{option.label}</span>
                          {aspectRatio === option.id && <Check size={12} className="text-accent" />}
                        </button>
                      ))}
                    </div>
                  </StudioPanel>
                </div>
              )}

              {activeStudioTool === 'text' && (
                <div className="space-y-3">
                  <CanvasElementPanel />

                  <StudioPanel title="Subtitles" icon={<Languages size={12} className="text-accent" />}>
                    <p className="text-xs text-muted leading-relaxed mb-3">
                      Edit translation lines, timing, and transcript segments in the subtitle editor.
                    </p>
                    <button type="button" onClick={openSubtitleEditor} className="studio-tools-action-btn">
                      Open subtitle editor
                      <ChevronRight size={14} />
                    </button>
                  </StudioPanel>
                </div>
              )}

              {activeStudioTool === 'sound' && (
                <div className="space-y-3">
                  <StudioPanel title="Waveforms" icon={<Volume2 size={12} className="text-accent" />}>
                    <AudioMixWaveforms videoRef={videoRef} />
                  </StudioPanel>

                  <StudioPanel title="Mix levels" icon={<Volume2 size={12} className="text-accent" />}>
                    <div className="space-y-4">
                      <Slider
                        label="Original"
                        valueLabel={`${Math.round(originalVolume * 100)}%`}
                        min={0}
                        max={1}
                        step={0.05}
                        value={originalVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setOriginalVolume(val);
                          if (videoRef.current) videoRef.current.volume = val;
                        }}
                      />
                      <Slider
                        label="AI Voice"
                        valueLabel={`${Math.round(voiceVolume * 100)}%`}
                        min={0}
                        max={2}
                        step={0.05}
                        value={voiceVolume}
                        onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      />
                    </div>
                  </StudioPanel>
                </div>
              )}

              {activeStudioTool === 'voice' && (
                <div className="space-y-3">
                  <StudioPanel title="Language & Voice" icon={<Languages size={12} className="text-accent" />}>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Target Language</Label>
                        <Select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code} className="bg-[var(--surface)]">
                              {lang.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Main Narrator</Label>
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

                  {detectedSpeakers.length > 0 && (
                    <StudioPanel
                      title={`Speakers (${detectedSpeakers.length})`}
                      icon={<Mic2 size={12} className="text-accent" />}
                    >
                      <div className="space-y-2">
                        {detectedSpeakers.map((speaker) => (
                          <div
                            key={speaker}
                            className="flex flex-col gap-2 p-3 rounded-xl border border-[color:var(--border)] bg-[var(--surface-hi)]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-[var(--text)] truncate">
                                {speaker}
                              </span>
                              <button
                                type="button"
                                onClick={() => onPreviewVoice(speaker)}
                                disabled={previewingSpeaker !== null}
                                className="p-1.5 rounded-lg border border-[color:var(--border)] bg-[var(--surface)] text-accent transition-colors hover:border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] disabled:opacity-40 disabled:cursor-not-allowed"
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
                                <option key={v.id} value={v.id} className="bg-[var(--surface)]">
                                  {v.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ))}
                      </div>
                    </StudioPanel>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </aside>
  );
}
