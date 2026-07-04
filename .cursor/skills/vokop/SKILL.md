---
name: vokop
description: >-
  Develop the Vokop video editing monorepo — React studio UI, API gateway,
  FFmpeg video-tools, AI content service (LLM registry, 302.AI, FunClip-inspired
  ASR/translate/voice), editor presets, sessions/jobs. Use when working on Vokop,
  video timeline, canvas editor, translation/voiceover, filters, transitions,
  monorepo packages, or backend video/AI processing. References Omniclip for
  editor core patterns and FunClip for AI generate-content service design.
---

# Vokop Development

## What Vokop is

Browser-based video studio (CapCut-like): timeline editing, canvas overlays, AI translation/voiceover, AI content generation (ASR/subtitles/clip assist), server-side FFmpeg for filmstrip/probe, and editor presets for filters/transitions/captions/audio mix.

## Architecture (read before large changes)

```
Browser (apps/web, apps/admin) — CapCut-style UI / admin console
  → /api proxy → gateway :4000
    → video-tools :4001 (FFmpeg, sessions, jobs, presets)
    → auth :4002 (account & security only)
    → studio :4003 (projects CRUD + trash)
    → admin-service :4004 (RBAC, menus, users)
    → ai-content :4005 (text, image, voice, translate, transcripts, agent)
    → MongoDB + Redis (packages/db, docker-compose)
```

Shared contracts: `@vokop/api` (Zod + client), `@vokop/shared` (types/constants), `@vokop/ui` (components), `@vokop/service-auth` (JWT verify middleware for studio/admin), `@vokop/pipeline` (FFmpeg timeline/probe/render used by `video-tools`).

## Reference projects (do not fork UI)

Use these open-source projects as **architecture and capability references only**. Always implement Vokop’s own UI/UX, naming, and monorepo patterns.

| Project | Role in Vokop | Use for | Do not |
|---------|---------------|---------|--------|
| [Omniclip](https://github.com/omni-media/omniclip) | Video editor **frontend core** inspiration | Timeline/clip model, trim/split, undo/redo, effects/transitions concepts, project manager patterns, browser media pipeline ideas (e.g. WebCodecs-oriented thinking) | Copy Omniclip components, DOM tags, or visual design |
| [Omnitool](https://github.com/omni-media/omnitool) | Browser **video tools** (`@omnimedia/omnitool`) | Client filmstrip, timeline build/playback/export via WebCodecs — see `apps/web/src/features/studio/lib/omniTool/` | Use in Node `services/video-tools` (FFmpeg stays server-side) |
| [FunClip](https://github.com/modelscope/FunClip) | **AI generate-content** service inspiration | ASR/transcription, SRT subtitles, speaker-aware segments, LLM-assisted clip selection, hotwords | Embed Gradio UI or ship FunClip’s Python UI in `apps/web` |
| [302.AI](https://302.ai/) | Optional **unified LLM gateway** | One API key for many models (`provider: 302ai`, `AI_302_API_KEY`) | Hard-code only 302; keep native gemini/openai/claude providers |

### Omniclip → studio frontend core

When extending the editor in `apps/web/src/features/studio/`:

- Prefer a clear **state → actions → views** flow (align with existing Zustand `useAppStore`).
- Model timeline as clips/tracks (trim, split, reorder) rather than one opaque video blob.
- Keep preview/canvas interactions (move, resize, rotate, text style) in Vokop’s Konva canvas layer.
- Plan export/render paths that can grow toward higher-quality browser or server render; today server FFmpeg lives in `video-tools`.
- **Always keep Vokop’s CapCut-style chrome**: menubar, tools rail, black studio shell, custom export/launch buttons.

### FunClip + LLM registry → `services/ai-content`

AI generate-content is **`services/ai-content`** (port 4005), not Gradio and not client-only Gemini long-term.

**LLM provider registry** (`src/llm/`): `302ai` | `gemini` | `openai` | `claude`. Use `optionsForFeature()` for task routing. Prefer 302.AI when `AI_302_API_KEY` is set.

Studio capabilities (gateway `/api/v1/ai/*`):

| Feature | Path | Mode |
|---------|------|------|
| Capabilities | `GET /ai/capabilities` | sync |
| Transcripts | `POST /ai/transcribe` | async job |
| Translate | `POST /ai/translate` | sync |
| Image | `POST /ai/image/analyze` | sync |
| Voice TTS | `POST /ai/voice/tts` | sync |
| Text assist | `POST /ai/text` | sync |
| Subtitles | `POST /ai/subtitles` | sync |
| Clip suggest | `POST /ai/clip-suggest` | sync |
| Agent | `POST /ai/agent` | sync |
| Jobs | `GET /ai/jobs/:id` | poll |

Integration rules:

- Prefer video `sessionId` from video-tools when possible; accept `mediaBase64` for multimodal.
- Long work = **async jobs** + progress polling (same pattern as filmstrip jobs).
- Contracts in `@vokop/api` (`schemas/ai.ts`, `ApiClient`); gateway proxies `/api/v1/ai` → `AI_CONTENT_URL`.
- UI calls `api.translate` / `api.startTranscribe` / … from studio tools — never mount FunClip Gradio.
- Smoke test: `node --env-file=.env scripts/test-ai-302.mjs`.

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

Requires Docker (Mongo/Redis) and ffmpeg for full server-side video features. If Mongo auth fails on localhost, ensure no host Homebrew `mongod` is bound to `27017` (it shadows Docker).

### Add an API endpoint

1. Schema in `packages/api/src/schemas/`
2. Route in `packages/api/src/routes.ts`
3. Client method in `packages/api/src/client.ts`
4. Handler in the owning service (`video-tools`, `auth`, `studio`, `admin`, or `ai-content`)
5. Proxy in `services/gateway/src/proxy/routes.ts` if new top-level path

### Extend `services/ai-content`

1. Add/adjust Zod schemas in `packages/api/src/schemas/ai.ts` + `ApiClient`
2. Implement service under `services/ai-content/src/services/`
3. Route in `src/routes/ai.ts`; use `optionsForFeature()` / registry for LLM calls
4. New provider: `src/llm/providers/*` + register in `registry.ts` + extend `llmProviderIdSchema`
5. Wire studio UI to poll jobs / apply segments to timeline/canvas

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
- Put public `/api/v1/ai` handlers in video-tools (ai-content owns that path)

## Reference

For API route table, env vars, package map, and external reference notes, see [reference.md](reference.md).
