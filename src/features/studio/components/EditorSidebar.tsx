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
          animate={{ width: 400, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="studio-sidebar studio-sidebar--right"
        >
          <div className="studio-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn('studio-tab', activeTab === tab.id && 'active')}
              >
                {tab.icon}
                <span className="hidden lg:inline">{tab.label}</span>
                {tabCounts[tab.id] != null && tabCounts[tab.id]! > 0 && (
                  <span className="studio-tab-count">{tabCounts[tab.id]}</span>
                )}
              </button>
            ))}
            <IconButton onClick={() => setEditorOpen(false)} className="p-2 text-faint shrink-0" title="Hide editor">
              <ChevronRight size={16} />
            </IconButton>
          </div>

          <div className="studio-sidebar-body studio-scrollbar">
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
