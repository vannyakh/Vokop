---
name: vokop
description: >-
  Develop the Vokop video editing monorepo — React studio UI, API gateway,
  FFmpeg video-tools, AI content service (FunClip-inspired), editor presets,
  sessions/jobs. Use when working on Vokop, video timeline, canvas editor,
  translation/voiceover, filters, transitions, monorepo packages, or backend
  video/AI processing. References Omniclip for editor core patterns and FunClip
  for AI generate-content service design.
---

# Vokop Development

## What Vokop is

Browser-based video studio (CapCut-like): timeline editing, canvas overlays, AI translation/voiceover, AI content generation (ASR/subtitles/clip assist), server-side FFmpeg for filmstrip/probe, and editor presets for filters/transitions/captions/audio mix.

## Architecture (read before large changes)

```
Browser (apps/web) — own CapCut-style UI/UX
  → /api proxy → gateway :4000
    → video-tools :4001 (FFmpeg, sessions, jobs, editor apply/preview)
    → auth :4002 (users, projects)
    → ai-content :4003 (FunClip-inspired ASR, subtitles, LLM clip assist)
    → MongoDB + Redis (packages/db, docker-compose)
```

Shared contracts: `@vokop/api` (Zod + client), `@vokop/shared` (types/constants), `@vokop/ui` (components).

## Reference projects (do not fork UI)

Use these open-source projects as **architecture and capability references only**. Always implement Vokop’s own UI/UX, naming, and monorepo patterns.

| Project | Role in Vokop | Use for | Do not |
|---------|---------------|---------|--------|
| [Omniclip](https://github.com/omni-media/omniclip) | Video editor **frontend core** inspiration | Timeline/clip model, trim/split, undo/redo, effects/transitions concepts, project manager patterns, browser media pipeline ideas (e.g. WebCodecs-oriented thinking) | Copy Omniclip components, DOM tags, or visual design |
| [Omnitool](https://github.com/omni-media/omnitool) | Browser **video tools** (`@omnimedia/omnitool`) | Client filmstrip, timeline build/playback/export via WebCodecs — see `apps/web/src/features/studio/lib/omniTool/` | Use in Node `services/video-tools` (FFmpeg stays server-side) |
| [FunClip](https://github.com/modelscope/FunClip) | **AI generate-content** service inspiration | ASR/transcription, SRT subtitles, speaker-aware segments, LLM-assisted clip selection, hotwords | Embed Gradio UI or ship FunClip’s Python UI in `apps/web` |

### Omniclip → studio frontend core

When extending the editor in `apps/web/src/features/studio/`:

- Prefer a clear **state → actions → views** flow (align with existing Zustand `useAppStore`).
- Model timeline as clips/tracks (trim, split, reorder) rather than one opaque video blob.
- Keep preview/canvas interactions (move, resize, rotate, text style) in Vokop’s Konva canvas layer.
- Plan export/render paths that can grow toward higher-quality browser or server render; today server FFmpeg lives in `video-tools`.
- **Always keep Vokop’s CapCut-style chrome**: menubar, tools rail, black studio shell, custom export/launch buttons.

### FunClip → `services/ai-content`

Add AI generate-content as its **own service** (planned path: `services/ai-content`), not inside `apps/web` or Gradio.

Capabilities to map into Vokop APIs (via gateway):

1. **Transcribe** video/audio session → timed segments + full SRT
2. **Speakers** (optional diarization) → segment `speakerId`
3. **Subtitles** → project/timeline caption clips
4. **LLM clip assist** → suggested `[start, end]` ranges from transcript + prompt
5. **Hotwords** (optional) for entity/name boost during ASR

Integration rules:

- Input should reuse **video `sessionId`** from `video-tools` when possible (no full re-upload).
- Long work = **async jobs** + progress polling (same pattern as filmstrip jobs).
- Contracts in `@vokop/api`; proxy `/api/v1/ai/*` (or `/api/v1/content/*`) from gateway.
- UI calls the API from studio tools (e.g. captions/voice/translate panels) — never mount FunClip’s Gradio UI.

## UI library policy

- Use `@vokop/ui` for reusable shared primitives and app-wide UI components.
- Import Ant Design from `@vokop/ui/antd` (not `antd` directly in apps). Use shared `ThemeProvider` / `AntdProvider`, `UI_SYSTEM_CONFIG`, and `UI_THEME_TOKENS` for theme tokens.
- Import shadcn/Radix-style primitives from `@vokop/ui/shadcn` when needed for custom composition.
- Keep product-specific styling and layout customization in the owning app/project component (`apps/web`, `apps/admin`) unless it is clearly reusable across apps.
- When a UI pattern becomes shared, move the stable primitive into `packages/ui`; avoid duplicating component logic across app folders.

## Common tasks

### Run locally

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm dev
```

Requires Docker (Mongo/Redis) and ffmpeg for full server-side video features.

### Add an API endpoint

1. Schema in `packages/api/src/schemas/`
2. Route in `packages/api/src/routes.ts`
3. Client method in `packages/api/src/client.ts`
4. Handler in the owning service (`video-tools`, `auth`, or `ai-content`)
5. Proxy in `services/gateway/src/index.ts` if new top-level path

### Add `services/ai-content` (FunClip-inspired)

1. Scaffold `services/ai-content` (Express + `@vokop/db` + `@vokop/api`)
2. Schemas: transcribe request/response, subtitle SRT, LLM clip suggestions, job status
3. Routes under `/api/v1/ai/...` via gateway
4. Prefer session-based media from `video-tools`; fall back to upload only when needed
5. Wire studio UI actions (captions / AI clip) to poll jobs and apply segments to timeline/canvas

### Add an editor preset (filter, transition, etc.)

1. Add preset in `packages/shared/src/constants/editor.ts` with `cssFilter` + `ffmpegFilter` when visual
2. Catalog auto-includes via `getEditorCatalog()`
3. UI picks it up through `useEditorCatalog()` — no hardcoded chip lists in components

### Add a studio UI tool panel

1. Extend `StudioToolId` in `packages/shared/src/types/studio.ts` if new tool
2. Add rail entry in `StudioToolsDock.tsx`
3. Use `EditorPresetGrid` + `useEditorActions()` for preset-based tools
4. Store applied state in `useAppStore` → `projectEditor`

## Do not

- Duplicate types/constants already in `@vokop/shared` or `@vokop/api`
- Put React providers in `@vokop/shared` main export (use `@vokop/shared/providers`)
- Re-upload full video per operation — use video session + sessionId
- Add button transform hover effects
- Copy Omniclip or FunClip UI into Vokop; reference behavior and pipelines only
- Run FunClip Gradio as the product UI

## Reference

For API route table, env vars, package map, and external reference notes, see [reference.md](reference.md).
