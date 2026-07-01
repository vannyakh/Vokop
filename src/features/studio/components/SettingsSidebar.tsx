import { Settings, ChevronLeft, Volume2, Loader2, Languages, Mic2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/features/project';
import { LANGUAGES } from '@/features/translation/constants/languages';
import { VOICES } from '@/features/translation/constants/voices';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { IconButton } from '@/components/ui/IconButton';
import { StudioPanel } from '@/features/studio/components/StudioPanel';

interface SettingsSidebarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onPreviewVoice: (speaker: string) => void;
}

export function SettingsSidebar({ videoRef, onPreviewVoice }: SettingsSidebarProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const targetLang = useAppStore((s) => s.targetLang);
  const setTargetLang = useAppStore((s) => s.setTargetLang);
  const selectedVoice = useAppStore((s) => s.selectedVoice);
  const setSelectedVoice = useAppStore((s) => s.setSelectedVoice);
  const originalVolume = useAppStore((s) => s.originalVolume);
  const setOriginalVolume = useAppStore((s) => s.setOriginalVolume);
  const voiceVolume = useAppStore((s) => s.voiceVolume);
  const setVoiceVolume = useAppStore((s) => s.setVoiceVolume);
  const detectedSpeakers = useAppStore((s) => s.detectedSpeakers);
  const speakerVoices = useAppStore((s) => s.speakerVoices);
  const updateSpeakerVoice = useAppStore((s) => s.updateSpeakerVoice);
  const previewingSpeaker = useAppStore((s) => s.previewingSpeaker);

  return (
    <AnimatePresence initial={false}>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="shrink-0 border-r border-white/5 bg-[var(--color-studio-surface)]/80 backdrop-blur-xl flex flex-col overflow-hidden"
        >
          <div className="h-12 px-4 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-accent" />
              <span className="text-xs font-semibold text-muted">Project Settings</span>
            </div>
            <IconButton onClick={() => setSidebarOpen(false)} className="p-1.5 text-faint">
              <ChevronLeft size={16} />
            </IconButton>
          </div>

          <div className="flex-1 overflow-y-auto studio-scrollbar p-4 space-y-4">
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

            <StudioPanel title="Audio Mix" icon={<Volume2 size={12} className="text-accent" />}>
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

            {detectedSpeakers.length > 0 && (
              <StudioPanel
                title={`Speakers (${detectedSpeakers.length})`}
                icon={<Users size={12} className="text-accent" />}
              >
                <div className="space-y-2">
                  {detectedSpeakers.map((speaker) => (
                    <div
                      key={speaker}
                      className="flex flex-col gap-2 p-3 bg-black/20 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[var(--text)] truncate">{speaker}</span>
                        <button
                          type="button"
                          onClick={() => onPreviewVoice(speaker)}
                          disabled={previewingSpeaker !== null}
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-accent transition-colors disabled:opacity-40"
                          title="Preview voice"
                        >
                          {previewingSpeaker === speaker ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Mic2 size={12} />
                          )}
                        </button>
                      </div>
                      <select
                        value={speakerVoices[speaker] || 'Kore'}
                        onChange={(e) => updateSpeakerVoice(speaker, e.target.value)}
                        className="w-full bg-black/30 border border-[color:var(--border)] rounded-md px-2 py-1.5 text-[11px] font-medium text-[var(--text)] outline-none cursor-pointer focus:border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)]"
                      >
                        {VOICES.map((v) => (
                          <option key={v.id} value={v.id} className="bg-[var(--surface)]">
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </StudioPanel>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
