import type { RefObject } from 'react';
import { ChevronRight, Languages, Type, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useSegments } from '@/features/translation/hooks/useSegments';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentList } from '@/features/studio/components/SegmentList';
import { AnalysisPanel } from '@/features/studio/components/AnalysisPanel';
import type { EditorTab } from '@/types';

interface EditorSidebarProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onPlayAnalysis: () => void;
  onStartReel: () => void;
}

const TABS: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
  { id: 'translate', label: 'Translate', icon: <Languages size={13} /> },
  { id: 'transcript', label: 'Transcript', icon: <Type size={13} /> },
  { id: 'analysis', label: 'Analysis', icon: <Sparkles size={13} /> },
];

export function EditorSidebar({ videoRef, onPlayAnalysis, onStartReel }: EditorSidebarProps) {
  const editorOpen = useAppStore((s) => s.editorOpen);
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const updateSegment = useAppStore((s) => s.updateSegment);
  const videoAnalysis = useAppStore((s) => s.videoAnalysis);
  const { transcriptSegments, translationSegments, activeSegmentIndex } = useSegments();

  const tabCounts: Record<EditorTab, number | null> = {
    translate: translationSegments.length || null,
    transcript: transcriptSegments.length || null,
    analysis: videoAnalysis?.highlights.length ?? null,
  };

  return (
    <AnimatePresence initial={false}>
      {editorOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 380, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="shrink-0 border-l border-white/5 bg-[var(--color-studio-surface)]/80 backdrop-blur-xl flex flex-col overflow-hidden"
        >
          <div className="h-12 flex items-center border-b border-white/5 px-2 shrink-0 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all',
                  activeTab === tab.id
                    ? 'text-[var(--text)] bg-accent-soft border border-[color:color-mix(in_srgb,var(--accent)_25%,transparent)]'
                    : 'text-faint hover:text-muted hover:bg-white/5',
                )}
              >
                {tab.icon}
                <span className="hidden lg:inline">{tab.label}</span>
                {tabCounts[tab.id] != null && tabCounts[tab.id]! > 0 && (
                  <span
                    className={cn(
                      'min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center',
                      activeTab === tab.id ? 'bg-accent text-[var(--accent-ink)]' : 'bg-[var(--surface-hi)] text-muted',
                    )}
                  >
                    {tabCounts[tab.id]}
                  </span>
                )}
              </button>
            ))}
            <IconButton onClick={() => setEditorOpen(false)} className="p-2 text-faint shrink-0">
              <ChevronRight size={16} />
            </IconButton>
          </div>

          <div className="flex-1 overflow-y-auto studio-scrollbar p-4">
            {activeTab === 'translate' && (
              <SegmentList
                segments={translationSegments}
                activeSegmentIndex={activeSegmentIndex}
                type="translation"
                videoRef={videoRef}
                onUpdateSegment={updateSegment}
              />
            )}
            {activeTab === 'transcript' && (
              <SegmentList
                segments={transcriptSegments}
                activeSegmentIndex={activeSegmentIndex}
                type="transcript"
                videoRef={videoRef}
                onUpdateSegment={updateSegment}
              />
            )}
            {activeTab === 'analysis' && (
              <AnalysisPanel
                videoRef={videoRef}
                onPlayAnalysis={onPlayAnalysis}
                onStartReel={onStartReel}
              />
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
