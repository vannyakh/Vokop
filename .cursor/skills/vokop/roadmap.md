# Vokop Product Roadmap

Use this when planning features, prioritizing work, or scoping new studio/editor tasks.

## One-by-one implementation workflow

Build in order below. For each item: **implement → run tests → manual QA → mark done** before starting the next.

| Phase | Feature | Status | Test |
|-------|---------|--------|------|
| 1 | Templates system | **done** | `pnpm exec tsx scripts/test-studio-templates.ts` + home gallery + studio apply |
| 2 | Auto captions | **done** | `pnpm exec tsx scripts/test-caption-segments.ts` + Captions tool generate + word editor |
| 3 | Transitions (xfade builder) | **done** | `pnpm exec tsx scripts/test-xfade-builder.ts` + Transitions panel + export graph |
| 4 | Beat detection / auto-cut | **done** | `pnpm test:beats` + Audio tool beat panel + timeline markers |
| 5 | Background removal | pending | Segmentation API + mask preview |
| 6 | Voice changer / DSP | pending | Audio effects pipeline |

After phase 6, continue down the full checklist sections below (Core Editor gaps, Canvas, Keyframes, etc.).

## Suggested build order

Highest "feels premium" ROI first, given Vokop architecture:

1. **Templates system**
2. **Auto captions**
3. **Transitions** (xfade builder)
4. **Beat detection / auto-cut**
5. **Background removal**
6. **Voice changer / DSP effects**

When the user asks what to build next without specifying, prefer this order unless they override.

---

## Core Editor

- Multi-track timeline (video / audio / text / sticker tracks)
- Trim, split, duplicate, ripple delete
- Drag reorder + snapping (clips, playhead, markers)
- Undo/redo history stack
- Track lock / hide / mute
- Group/link clips (e.g. video + its audio)

## Canvas / Preview / Playback

- Real-time canvas compositor (frame draw from all tracks at playhead)
- Frame-accurate scrubbing + thumbnail preview
- Play/pause/loop, variable preview speed
- Aspect ratio switcher (9:16, 1:1, 16:9, 4:5)
- Zoom/pan canvas + safe-zone overlay
- Draft (proxy) vs full-quality preview toggle

## Keyframes & Transform

- Animatable props: x, y, scale, rotation, opacity, volume
- Easing curves (linear, easeIn/Out, easeInOut, hold)
- Keyframe editor UI on timeline (add/delete/drag)

## Media Library

- Chunked upload to R2/S3 + progress
- Auto proxy generation on ingest (done)
- Asset bins (video/image/audio/text/sticker) with search + tags
- Stock library integration (optional: Pexels/Pixabay)
- Recently used panel

## Text

- Style presets (title/subtitle/caption)
- Font manager (upload + Google Fonts)
- Fill/stroke/shadow/background box
- Animated text presets (in/out/loop)
- Auto captions with word-level editable timing (Whisper/STT)

## Video & Image Tools

- Crop, rotate, flip, reverse
- Speed ramp (with frame interpolation)
- Chroma key (green screen)
- Freeze frame
- Picture-in-picture + blend modes
- Mask tools (shape, linear, mirror)
- Background removal (segmentation model)
- Scene/shot auto-detection on ingest

## Effects & Filters

- LUT-based filter presets (categorized)
- Manual color adjust (brightness/contrast/saturation/temp/tint)
- VFX library (glitch, shake, blur, vignette, particles)
- Ordered effect stack per clip
- Effect intensity as keyframeable property

## Transitions

- Cut, dissolve, wipe, slide, zoom, spin
- Adjustable overlap duration
- Transition preview thumbnails
- FFmpeg filter-graph builder (xfade-style) consuming Transition[]

## Stickers & Overlays

- Sticker library (PNG / Lottie / APNG)
- Draggable/resizable/rotatable on canvas
- Custom sticker upload

## Audio & Music

- Royalty-free music library (mood/genre tags)
- Waveform visualization on audio track
- Volume keyframes + fade in/out
- Auto beat detection (sync cuts to music)
- In-browser voice-over recording
- Audio ducking (auto-lower music under speech)
- Voice changer (pitch/formant shift)
- Sound effects library

## Templates & Automation

- Asset-agnostic template system (swap assetIds into saved edit)
- Auto-cut-to-music (beat detection + scene detection combo)

## Export / Render

- Platform presets (TikTok, Shorts, Reels resolution/bitrate)
- Render queue with progress % (BullMQ — in progress)
- Watermark toggle (free/paid tier)
- Background render + notify on complete

---

## Implementation hints (Vokop mapping)

| Area | Primary paths |
|------|----------------|
| Timeline / clips | `apps/web/src/features/studio/`, `useAppStore.ts`, `studioEdit.ts` |
| Canvas / preview | `CanvasEditorStage.tsx`, `VideoPreviewFrame.tsx`, Konva layer |
| Keyframes | `keyframeUtils.ts`, `CanvasKeyframe` in `timelineTypes.ts` |
| Presets (filters/transitions/captions) | `packages/shared/src/constants/editor.ts`, `useEditorActions()` |
| FFmpeg / render | `services/video-tools`, `@vokop/pipeline` |
| AI (captions, voice, clip suggest) | `services/ai-content`, `/api/v1/ai/*` |
| Upload / proxy | video session upload, filmstrip jobs, OPFS cache (`opfsMediaCache.ts`) |
| Templates | `@vokop/shared` `studioTemplates.ts`, `applyStudioTemplate.ts`, `StudioTemplateGallery`, `useAppStore.applyStudioTemplate` |

## Partial / in-progress (as of last update)

Not exhaustive — verify in codebase before assuming done:

- Multi-track timeline, trim/split/duplicate, drag + snap, track mute/lock/hide — largely present
- Undo/redo — `StudioHeaderHistoryTools.tsx` exists; verify coverage
- Canvas transforms + keyframes (x, y, scale, rotation, opacity) — canvas layer; volume keyframes pending
- Aspect ratio switcher — shared constants + media tool
- Extract/detach audio from video — recent addition
- **Templates system** — catalog + apply + home gallery + slot banner (phase 1)
- Transitions UI + GLSL preview — partial; FFmpeg xfade builder pending
- Auto proxy on ingest — marked done in roadmap
- Render queue (BullMQ) — in progress per roadmap
