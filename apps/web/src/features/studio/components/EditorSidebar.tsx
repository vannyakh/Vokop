import type { RefObject } from 'react';
import { Languages, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useSegments } from '@/features/translation/hooks/useSegments';
import { StudioIcon } from '@vokop/ui';
import { SegmentList } from '@/features/studio/components/SegmentList';
import { AnalysisPanel } from '@/features/studio/components/AnalysisPanel';
import { ClipInspectorPanel } from '@/features/studio/components/ClipInspectorPanel';
import { useSidePanelSplit } from '@/features/studio/hooks/useSidePanelSplit';
import type { EditorTab } from '@/types';

interface EditorSidebarProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onPlayAnalysis: () => void;
  onStartReel: () => void;
}

const TABS: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
  { id: 'inspector', label: 'Inspector', icon: <StudioIcon name="sliders" size={20} /> },
  { id: 'translate', label: 'Translate', icon: <Languages size={20} /> },
  { id: 'transcript', label: 'Transcript', icon: <StudioIcon name="text" size={20} /> },
  { id: 'analysis', label: 'Analysis', icon: <Sparkles size={20} /> },
];

const RIGHT_PANEL_MIN = 280;
const RIGHT_PANEL_MAX = 560;
const RIGHT_PANEL_DEFAULT = 400;

export function EditorSidebar({ videoRef, onPlayAnalysis, onStartReel }: EditorSidebarProps) {
  const editorOpen = useAppStore((s) => s.editorOpen);
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const updateSegment = useAppStore((s) => s.updateSegment);
  const videoAnalysis = useAppStore((s) => s.videoAnalysis);
  const selectedTimelineClip = useAppStore((s) => s.selectedTimelineClip);
  const selectedCanvasElementId = useAppStore((s) => s.selectedCanvasElementId);
  const { transcriptSegments, translationSegments, activeSegmentIndex } = useSegments();
  const {
    width: panelWidth,
    minWidth,
    maxWidth,
    dragging: splitDragging,
    splitterProps,
  } = useSidePanelSplit({
    storageKey: 'vokop-right-panel-width',
    defaultWidth: RIGHT_PANEL_DEFAULT,
    minWidth: RIGHT_PANEL_MIN,
    maxWidth: RIGHT_PANEL_MAX,
    edge: 'right',
  });

  const tabCounts: Record<EditorTab, number | null> = {
    inspector: selectedTimelineClip || selectedCanvasElementId ? 1 : null,
    translate: translationSegments.length || null,
    transcript: transcriptSegments.length || null,
    analysis: videoAnalysis?.highlights.length ?? null,
  };

  const selectTab = (tab: EditorTab) => {
    if (activeTab === tab && editorOpen) {
      setEditorOpen(false);
    } else {
      setActiveTab(tab);
      setEditorOpen(true);
    }
  };

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label;

  return (
    <aside className="studio-editor-dock" aria-label="Editor panels">
      {editorOpen && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize inspector panel"
            aria-valuenow={Math.round(panelWidth)}
            aria-valuemin={minWidth}
            aria-valuemax={maxWidth}
            className={cn(
              'studio-side-splitter studio-side-splitter--leading',
              splitDragging && 'is-dragging',
            )}
            {...splitterProps}
          >
            <span className="studio-side-splitter-grip" aria-hidden>
              <span className="studio-side-splitter-pill studio-side-splitter-pill--accent" />
              <span className="studio-side-splitter-thumb" />
              <span className="studio-side-splitter-pill studio-side-splitter-pill--muted" />
            </span>
          </div>

          <div className="studio-editor-panel" style={{ width: panelWidth }}>
            <div className="studio-tools-panel-titlebar">
              <span className="studio-tools-panel-title">{activeLabel}</span>
            </div>

            <div className="studio-sidebar-body studio-scrollbar">
              {activeTab === 'inspector' && <ClipInspectorPanel />}
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
          </div>
        </>
      )}

      <div className="studio-tools-rail studio-editor-rail">
        {TABS.map((tab) => {
          const count = tabCounts[tab.id];
          const active = activeTab === tab.id && editorOpen;
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              onClick={() => selectTab(tab.id)}
              className={cn('studio-tools-rail-btn', active && 'active')}
            >
              <span className="studio-editor-rail-icon">
                {tab.icon}
                {count != null && count > 0 && (
                  <span className="studio-editor-rail-count">{count}</span>
                )}
              </span>
              <span className="studio-tools-rail-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
