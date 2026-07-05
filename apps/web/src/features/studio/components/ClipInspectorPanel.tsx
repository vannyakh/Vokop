import { Film, Type, Music2, Clock } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { CanvasElementPanel } from '@/features/studio/components/CanvasElementPanel';
import { RightPanelEmpty } from '@/features/studio/components/RightPanelEmpty';
import { InspectorDock, InspectorSection } from '@/features/studio/components/InspectorSection';
import { useStudioEdit } from '@/features/studio/hooks/useStudioEdit';
import { Label, Slider, StudioIcon } from '@vokop/ui';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import { isOverlayTimelineTrack } from '@/features/studio/lib/timelineTrackUtils';
import { parseSegments } from '@/lib/utils/transcript';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="clip-inspector-field">
      <span className="clip-inspector-field-label">{label}</span>
      <span className="clip-inspector-field-value font-mono">{value}</span>
    </div>
  );
}

function MediaClipInspector({
  trackId,
  clipId,
}: {
  trackId: 'video' | 'audio';
  clipId: string;
}) {
  const videoClips = useAppStore((s) => s.videoClips);
  const audioClips = useAppStore((s) => s.audioClips);
  const {
    updateMediaClip,
    updateVideoTransform,
    extractAudioFromVideo,
    detachAudioFromVideo,
    splitAtPlayhead,
  } = useStudioEdit();
  const removeTimelineClip = useAppStore((s) => s.removeTimelineClip);
  const timelineTrackMuted = useAppStore((s) => s.timelineTrackMuted);
  const toggleTimelineTrackMuted = useAppStore((s) => s.toggleTimelineTrackMuted);
  const originalVolume = useAppStore((s) => s.originalVolume);
  const setOriginalVolume = useAppStore((s) => s.setOriginalVolume);
  const voiceVolume = useAppStore((s) => s.voiceVolume);
  const setVoiceVolume = useAppStore((s) => s.setVoiceVolume);
  const projectEditor = useAppStore((s) => s.projectEditor);
  const getVideoCssFilter = useAppStore((s) => s.getVideoCssFilter);

  const clips = trackId === 'video' ? videoClips : audioClips;
  const clip = clips.find((item) => item.id === clipId);
  if (!clip) {
    return <p className="clip-inspector-empty">Clip not found.</p>;
  }

  const muted = timelineTrackMuted[trackId] ?? false;
  const end = clip.start + clip.duration;
  const Icon = trackId === 'video' ? Film : Music2;

  return (
    <InspectorDock
      title={trackId === 'video' ? 'Video clip' : 'Audio clip'}
      icon={<Icon size={12} className="text-accent" />}
    >
      <InspectorSection id="clip-info" title="Clip" summary={clip.name} defaultOpen>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <input
            className="clip-inspector-input"
            value={clip.name}
            onChange={(e) => updateMediaClip(clip.id, { name: e.target.value })}
          />
        </div>
        <div className="clip-inspector-grid">
          <Field label="Start" value={formatStudioTimecode(clip.start)} />
          <Field label="End" value={formatStudioTimecode(end)} />
          <Field label="Duration" value={formatStudioTimecode(clip.duration)} />
          <Field label="In point" value={formatStudioTimecode(clip.sourceStart)} />
        </div>
      </InspectorSection>

      <InspectorSection
        id="clip-timing"
        title="Timing"
        summary={formatStudioTimecode(clip.duration)}
        defaultOpen
      >
        <div className="space-y-1.5">
          <Label>Timeline start (s)</Label>
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
        </div>
        <div className="space-y-1.5">
          <Label>Duration (s)</Label>
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
        </div>
        <div className="space-y-1.5">
          <Label>Source in-point (s)</Label>
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
        </div>
      </InspectorSection>

      {trackId === 'video' && (
        <>
          <InspectorSection
            id="clip-composition"
            title="Composition"
            summary={
              clip.width != null
                ? `${Math.round(clip.width)}×${Math.round(clip.height ?? 0)}`
                : 'Frame'
            }
            defaultOpen
          >
            <div className="clip-inspector-grid">
              <div className="space-y-1.5">
                <Label>X</Label>
                <input
                  type="number"
                  step={1}
                  className="clip-inspector-input"
                  value={Number((clip.x ?? 0).toFixed(0))}
                  onChange={(e) =>
                    updateVideoTransform(clip.id, { x: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Y</Label>
                <input
                  type="number"
                  step={1}
                  className="clip-inspector-input"
                  value={Number((clip.y ?? 0).toFixed(0))}
                  onChange={(e) =>
                    updateVideoTransform(clip.id, { y: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Width</Label>
                <input
                  type="number"
                  min={48}
                  step={1}
                  className="clip-inspector-input"
                  value={Number((clip.width ?? 0).toFixed(0))}
                  onChange={(e) =>
                    updateVideoTransform(clip.id, {
                      width: Math.max(48, Number(e.target.value) || 48),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Height</Label>
                <input
                  type="number"
                  min={48}
                  step={1}
                  className="clip-inspector-input"
                  value={Number((clip.height ?? 0).toFixed(0))}
                  onChange={(e) =>
                    updateVideoTransform(clip.id, {
                      height: Math.max(48, Number(e.target.value) || 48),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rotation</Label>
                <input
                  type="number"
                  step={1}
                  className="clip-inspector-input"
                  value={Number((clip.rotation ?? 0).toFixed(0))}
                  onChange={(e) =>
                    updateVideoTransform(clip.id, {
                      rotation: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Opacity</Label>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={clip.opacity ?? 1}
                  onChange={(e) =>
                    updateVideoTransform(clip.id, {
                      opacity: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </InspectorSection>

          <InspectorSection id="clip-video" title="Video settings" defaultOpen={false}>
            <div className="space-y-1.5">
              <Label>Original volume</Label>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={originalVolume}
                onChange={(e) => setOriginalVolume(Number(e.target.value))}
              />
            </div>
            <div className="clip-inspector-grid">
              <Field
                label="Filter"
                value={
                  projectEditor.videoFilterId ??
                  (getVideoCssFilter() === 'none' ? 'None' : 'Custom')
                }
              />
              <Field
                label="Transition in"
                value={projectEditor.clipEdits[clip.id]?.transitionInId ?? 'None'}
              />
              <Field
                label="Transition out"
                value={projectEditor.clipEdits[clip.id]?.transitionOutId ?? 'None'}
              />
            </div>
          </InspectorSection>
        </>
      )}

      {trackId === 'audio' && (
        <InspectorSection id="clip-audio" title="Audio settings" defaultOpen={false}>
          <div className="space-y-1.5">
            <Label>Voice volume</Label>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={voiceVolume}
              onChange={(e) => setVoiceVolume(Number(e.target.value))}
            />
          </div>
        </InspectorSection>
      )}

      <InspectorSection id="clip-actions" title="Actions" defaultOpen>
        <button
          type="button"
          className="studio-tools-action-btn w-full"
          onClick={() => toggleTimelineTrackMuted(trackId)}
        >
          {muted ? <StudioIcon name="volumeSlash" size={13} /> : <StudioIcon name="volume" size={13} />}
          {muted ? 'Unmute track' : 'Mute track'}
        </button>
        {trackId === 'video' && (
          <div className="clip-inspector-actions">
            <button
              type="button"
              className="studio-tools-action-btn"
              title="Copy audio to the audio track (video keeps sound)"
              onClick={() => extractAudioFromVideo(clip.id)}
            >
              Extract audio
            </button>
            <button
              type="button"
              className="studio-tools-action-btn"
              title="Move audio to the audio track and mute video"
              onClick={() => detachAudioFromVideo(clip.id)}
            >
              Detach audio
            </button>
          </div>
        )}
        {trackId === 'video' && clip.muted && (
          <button
            type="button"
            className="studio-tools-action-btn w-full"
            onClick={() => updateMediaClip(clip.id, { muted: false })}
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
            onClick={() => removeTimelineClip(trackId, clip.id)}
          >
            <StudioIcon name="bin" size={13} />
            Delete
          </button>
        </div>
      </InspectorSection>
    </InspectorDock>
  );
}

function SegmentInspector({
  clipId,
}: {
  clipId: string;
}) {
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
    <InspectorDock
      title={type === 'transcript' ? 'Transcript segment' : 'Translation segment'}
      icon={<Type size={12} className="text-accent" />}
    >
      <InspectorSection id="segment-content" title="Content" defaultOpen>
        <div className="clip-inspector-grid">
          <Field label="Start" value={formatStudioTimecode(segment.time)} />
          <Field label="Duration" value={formatStudioTimecode(duration)} />
        </div>
        {segment.speaker && <Field label="Speaker" value={segment.speaker} />}
        <div className="space-y-1.5">
          <Label>Text</Label>
          <textarea
            className="clip-inspector-textarea"
            rows={4}
            value={segment.text}
            onChange={(e) => updateSegment(index, e.target.value, type)}
          />
        </div>
      </InspectorSection>

      <InspectorSection id="segment-timing" title="Timing" defaultOpen={false}>
        <div className="space-y-1.5">
          <Label>Start (s)</Label>
          <input
            type="number"
            min={0}
            step={0.1}
            className="clip-inspector-input"
            value={Number(segment.time.toFixed(2))}
            onChange={(e) => updateSegmentTime(index, Math.max(0, Number(e.target.value) || 0), type)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Duration (s)</Label>
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
        </div>
      </InspectorSection>

      <InspectorSection id="segment-actions" title="Actions" defaultOpen={false}>
        <div className="clip-inspector-actions">
          <button
            type="button"
            className="studio-tools-action-btn"
            onClick={() => seekTimeline(segment.time)}
          >
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
    </InspectorDock>
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
    return <RightPanelEmpty message="Select an item to make adjustment" />;
  }

  const trackId = selectedTimelineClip?.trackId;
  const clipId = selectedTimelineClip?.clipId;

  if (clipId && (trackId === 'video' || trackId === 'audio')) {
    return <MediaClipInspector trackId={trackId as 'video' | 'audio'} clipId={clipId} />;
  }

  // Caption segments (translation-0 / transcript-0).
  if (clipId && isSegmentClipId(clipId)) {
    return <SegmentInspector clipId={clipId} />;
  }

  // Text templates, logos, images, and other canvas-backed clips.
  if (
    selectedCanvasElementId ||
    (clipId && canvasElements.some((el) => el.id === clipId)) ||
    (trackId && isOverlayTimelineTrack(trackId))
  ) {
    return <CanvasElementPanel />;
  }

  return <RightPanelEmpty message="Select an item to make adjustment" />;
}
