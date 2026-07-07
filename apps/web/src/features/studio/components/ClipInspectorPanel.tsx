import { Type, Clock } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { CompositionFramePanel } from '@/features/studio/components/CompositionFramePanel';
import { CanvasElementPanel } from '@/features/studio/components/CanvasElementPanel';
import { InspectorSection } from '@/features/studio/components/InspectorSection';
import { InspectorPropertiesShell } from '@/features/studio/components/InspectorPropertiesShell';
import { MediaClipInspector } from '@/features/studio/components/MediaClipInspector';
import { PropertyRow } from '@/features/studio/components/PropertyRow';
import { RightPanelEmpty } from '@/features/studio/components/RightPanelEmpty';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import {
  isAudioLikeTimelineTrack,
  isOverlayTimelineTrack,
  isVideoTimelineTrack,
} from '@/features/studio/lib/timelineTrackUtils';
import { parseSegments } from '@/lib/utils/transcript';
import { StudioIcon } from '@vokop/ui';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="clip-inspector-field">
      <span className="clip-inspector-field-label">{label}</span>
      <span className="clip-inspector-field-value font-mono">{value}</span>
    </div>
  );
}

function SegmentInspector({ clipId }: { clipId: string }) {
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
    <InspectorPropertiesShell
      title={type === 'transcript' ? 'Transcript segment' : 'Translation segment'}
      icon={<Type size={14} className="text-accent" />}
      tabs={[{ id: 'segment', label: 'Segment', icon: <Type size={16} /> }]}
      activeTabId="segment"
      onTabChange={() => {}}
    >
      <InspectorSection id="segment-content" title="Segment" summary={formatStudioTimecode(duration)} defaultOpen>
        <textarea
          className="clip-inspector-textarea"
          rows={4}
          value={segment.text}
          onChange={(e) => updateSegment(index, e.target.value, type)}
        />
        {segment.speaker && <Field label="Speaker" value={segment.speaker} />}
        <PropertyRow label="Start">
          <input
            type="number"
            min={0}
            step={0.1}
            className="clip-inspector-input"
            value={Number(segment.time.toFixed(2))}
            onChange={(e) => updateSegmentTime(index, Math.max(0, Number(e.target.value) || 0), type)}
          />
          <span className="property-row-unit">s</span>
        </PropertyRow>
        <PropertyRow label="Duration">
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
          <span className="property-row-unit">s</span>
        </PropertyRow>
      </InspectorSection>

      <InspectorSection id="segment-actions" title="Actions" defaultOpen={false}>
        <div className="clip-inspector-actions">
          <button type="button" className="studio-tools-action-btn" onClick={() => seekTimeline(segment.time)}>
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
    </InspectorPropertiesShell>
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
    return <CompositionFramePanel />;
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

  if (clipId && isSegmentClipId(clipId)) {
    return <SegmentInspector clipId={clipId} />;
  }

  if (
    selectedCanvasElementId ||
    (clipId && canvasElements.some((el) => el.id === clipId)) ||
    (trackId && isOverlayTimelineTrack(trackId))
  ) {
    return <CanvasElementPanel />;
  }

  return <RightPanelEmpty />;
}
