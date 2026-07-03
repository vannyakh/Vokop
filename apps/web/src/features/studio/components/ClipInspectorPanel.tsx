import {
  Film,
  Type,
  Music2,
  Layers,
  Volume2,
  VolumeX,
  Scissors,
  Trash2,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/features/project';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import { CanvasElementPanel } from '@/features/studio/components/CanvasElementPanel';
import { Label, Slider } from '@vokop/ui';
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
  const updateMediaClip = useAppStore((s) => s.updateMediaClip);
  const removeTimelineClip = useAppStore((s) => s.removeTimelineClip);
  const splitTimelineAtPlayhead = useAppStore((s) => s.splitTimelineAtPlayhead);
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
    <div className="tools-section-stack">
      <StudioPanel
        title={trackId === 'video' ? 'Video clip' : 'Audio clip'}
        icon={<Icon size={12} className="text-accent" />}
      >
        <div className="space-y-3">
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

          <button
            type="button"
            className="studio-tools-action-btn w-full"
            onClick={() => toggleTimelineTrackMuted(trackId)}
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {muted ? 'Unmute track' : 'Mute track'}
          </button>

          <div className="clip-inspector-actions">
            <button type="button" className="studio-tools-action-btn" onClick={splitTimelineAtPlayhead}>
              <Scissors size={13} />
              Split
            </button>
            <button
              type="button"
              className="studio-tools-action-btn studio-tools-action-btn--danger"
              onClick={() => removeTimelineClip(trackId, clip.id)}
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>
      </StudioPanel>

      {trackId === 'video' && (
        <StudioPanel title="Video settings" icon={<Film size={12} className="text-accent" />}>
          <div className="space-y-3">
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
            <Field
              label="Filter"
              value={projectEditor.videoFilterId ?? (getVideoCssFilter() === 'none' ? 'None' : 'Custom')}
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
        </StudioPanel>
      )}

      {trackId === 'audio' && (
        <StudioPanel title="Audio settings" icon={<Music2 size={12} className="text-accent" />}>
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
        </StudioPanel>
      )}
    </div>
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
    <StudioPanel
      title={type === 'transcript' ? 'Transcript segment' : 'Translation segment'}
      icon={<Type size={12} className="text-accent" />}
    >
      <div className="space-y-3">
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
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>
    </StudioPanel>
  );
}

function TrackDefaultsInspector() {
  const timelineTrackMuted = useAppStore((s) => s.timelineTrackMuted);
  const toggleTimelineTrackMuted = useAppStore((s) => s.toggleTimelineTrackMuted);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const duration = useAppStore((s) => s.duration);
  const mediaDuration = useAppStore((s) => s.mediaDuration);
  const videoClips = useAppStore((s) => s.videoClips);
  const audioClips = useAppStore((s) => s.audioClips);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const projectEditor = useAppStore((s) => s.projectEditor);

  return (
    <div className="tools-section-stack">
      <StudioPanel title="Project" icon={<Layers size={12} className="text-accent" />}>
        <div className="clip-inspector-grid">
          <Field label="Aspect" value={aspectRatio} />
          <Field label="Timeline" value={formatStudioTimecode(duration)} />
          <Field label="Media" value={formatStudioTimecode(mediaDuration)} />
          <Field label="Filter" value={projectEditor.videoFilterId ?? 'None'} />
        </div>
        <div className="clip-inspector-grid" style={{ marginTop: 10 }}>
          <Field label="Video clips" value={String(videoClips.length)} />
          <Field label="Audio clips" value={String(audioClips.length)} />
          <Field label="Overlays" value={String(canvasElements.length)} />
        </div>
      </StudioPanel>

      <StudioPanel title="Tracks" icon={<Film size={12} className="text-accent" />}>
        <div className="space-y-2">
          {(['video', 'text', 'overlay', 'audio'] as const).map((trackId) => {
            const muted = timelineTrackMuted[trackId] ?? false;
            return (
              <button
                key={trackId}
                type="button"
                className="studio-tools-action-btn w-full"
                onClick={() => toggleTimelineTrackMuted(trackId)}
              >
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span className="capitalize">{trackId}</span>
                <span className="text-faint ml-auto">{muted ? 'Muted' : 'Active'}</span>
              </button>
            );
          })}
        </div>
      </StudioPanel>

      <p className="clip-inspector-hint">Select a clip on the timeline to edit its settings.</p>
    </div>
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
    return <TrackDefaultsInspector />;
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

  return <TrackDefaultsInspector />;
}
