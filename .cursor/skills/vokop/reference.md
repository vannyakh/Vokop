# Vokop Reference

## Ports

| Service | Port |
|---------|------|
| Web (Vite) | 3000 |
| Admin (Vite) | 3001 |
| Gateway | 4000 |
| Video-tools | 4001 |
| Auth | 4002 |
| Studio | 4003 |
| Admin-service | 4004 |
| AI content | 4005 |
| MongoDB | 27017 |
| Redis | 6379 |

## Key API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | Gateway health |
| POST | `/api/v1/video/session` | Upload video → sessionId + probe |
| POST | `/api/v1/video/session/:id/jobs/filmstrip` | Async filmstrip with progress |
| GET | `/api/v1/video/jobs/:jobId` | Job status + partial thumbnails |
| GET | `/api/v1/video/editor/catalog` | All editor tool presets |
| POST | `/api/v1/video/editor/apply` | Apply preset to session |
| POST | `/api/v1/video/editor/preview` | Server filter preview frame |
| GET/POST | `/api/v1/projects` | List / create projects |
| GET/PATCH | `/api/v1/projects/:id` | Load / update project (realtime poll while processing) |

### AI content routes (`services/ai-content`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/ai/capabilities` | Feature availability + preferred providers/models |
| GET | `/api/v1/ai/llm/providers` | LLM registry status |
| POST | `/api/v1/ai/transcribe` | Start ASR job (timed segments + transcript) |
| GET | `/api/v1/ai/jobs/:jobId` | Job status + segments / transcript |
| POST | `/api/v1/ai/translate` | Translate text or caption segments |
| POST | `/api/v1/ai/image/analyze` | Image describe / OCR / caption |
| POST | `/api/v1/ai/voice/tts` | Text-to-speech → `audioBase64` |
| POST | `/api/v1/ai/text` | rewrite, summarize, captions, polish, expand |
| POST | `/api/v1/ai/subtitles` | Build SRT / VTT from segments |
| POST | `/api/v1/ai/clip-suggest` | LLM-assisted `[start,end]` suggestions |
| POST | `/api/v1/ai/agent` | Studio agent (plans + tools) |
| POST | `/api/v1/ai/llm/complete` | Low-level LLM completion |

Optional body fields on LLM routes: `provider` (`302ai` \| `gemini` \| `openai` \| `claude`), `model`.

Legacy (re-uploads file): `POST /api/v1/video/probe`, `POST /api/v1/video/filmstrip`

## Package responsibilities

| Package | Contains |
|---------|----------|
| `@vokop/shared` | `config/` (incl. `DEV_PORTS`), `constants/` (editor, aspect ratios), `types/`, `providers/` |
| `@vokop/api` | Zod schemas (incl. `schemas/ai.ts`), `ApiClient`, `routes` |
| `@vokop/i18n` | Shared locale config + `createI18n` / `toI18nextResources` |
| `@vokop/ui` | Shared reusable UI primitives (`Button`, `LaunchButton`, …). Ant Design via `@vokop/ui/antd`. shadcn via `@vokop/ui/shadcn`. |
| `@vokop/db` | `connectDatabases`, Redis/Mongo helpers, graceful shutdown |

## Service responsibilities

| Service | Role |
|---------|------|
| `gateway` | Single API entry; proxies `/api/v1/*` (`src/config`, `src/proxy`, `src/routes`, `src/ws`) |
| `auth` | Account & security only (login, register, JWT, me) — port 4002 |
| `studio` | Studio projects CRUD + soft-delete/trash — port 4003 |
| `admin-service` | Admin RBAC, menus, users — port 4004 |
| `video-tools` | FFmpeg sessions, filmstrip, presets, assets — port 4001 |
| `ai-content` | Studio AI (text/image/voice/translate/transcripts/agent) + LLM registry — port 4005 |
| Web `@omnimedia/omnitool` | Browser video tools via `apps/web/src/features/studio/lib/omniTool/` |
| `@vokop/ui` `StudioIcon` | Omniclip-adapted studio icons (`packages/ui/src/icons`) |
| `@vokop/editor` utils | Omniclip-adapted timeline/placement/human helpers |

## LLM providers (`services/ai-content/src/llm/`)

| Id | Env | Notes |
|----|-----|--------|
| `302ai` | `AI_302_API_KEY`, `AI_302_BASE_URL=https://api.302.ai` | Unified gateway ([302.AI](https://302.ai/), [docs](https://302ai-en.apifox.cn/)) |
| `gemini` | `GEMINI_API_KEY` | Direct Google Gemini |
| `openai` | `OPENAI_API_KEY` | Direct OpenAI |
| `claude` | `ANTHROPIC_API_KEY` | Direct Anthropic |

Default: `LLM_PROVIDER` (e.g. `302ai`). Feature routing: `optionsForFeature()` in `capabilities.ts`.

Smoke test: `node --env-file=.env scripts/test-ai-302.mjs`

## Web app entry points

| File | Role |
|------|------|
| `apps/web/src/main.tsx` | App bootstrap + ThemeProvider + i18n |
| `apps/web/src/routes/AppRouter.tsx` | Routes (`/`, `/studio`, `/studio/:projectId`) |
| `apps/web/src/features/project/store/useAppStore.ts` | Global project state |
| `apps/web/src/features/project/hooks/useStudioProject.ts` | Load/poll/save project via API |
| `apps/web/src/features/studio/components/StudioWorkspace.tsx` | Main editor shell |
| `apps/web/src/lib/api` | Browser API singleton + query keys |

## Environment variables

```
MONGODB_URI, REDIS_URL
GATEWAY_PORT, VIDEO_TOOLS_URL, AUTH_SERVICE_URL, STUDIO_SERVICE_URL, ADMIN_SERVICE_URL, AI_CONTENT_URL, WEB_ORIGIN
VIDEO_TOOLS_PORT, AUTH_PORT, STUDIO_PORT, ADMIN_SERVICE_PORT, AI_CONTENT_PORT
MAX_UPLOAD_MB, SESSION_TTL_SEC, MAX_FFMPEG_JOBS
LLM_PROVIDER, AI_302_API_KEY, AI_302_BASE_URL, AI_302_MODEL
GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
VITE_PIXABAY_API_KEY, VITE_GIPHY_API_KEY
VITE_API_URL  # optional; dev uses Vite proxy
```

## Studio tool → implementation map

| Tool | UI | Server | Store key |
|------|-----|--------|-----------|
| Media | Pixabay, local upload, aspect ratio | session upload | aspectRatio |
| Text | TextTemplatesPanel, CanvasElementPanel | `ai/text` (assist) | canvasElements |
| Audio | Waveform, mix presets | editor/apply | originalVolume, voiceVolume |
| Voice | Voice panel | `ai/voice/tts` | audioBase64, speakerVoices |
| Captions | Caption style presets | editor/apply + `ai/transcribe`, `ai/translate`, `ai/subtitles` | projectEditor.captionStyle |
| Effects | Effect presets + stickers | editor/preview | — |
| Transitions | Per-clip presets | editor/apply | projectEditor.clipEdits |
| Filters | Color presets | editor/preview | projectEditor.videoFilterId |
| AI clip | Studio AI panel | `ai/clip-suggest`, `ai/agent` | timeline clips |

## External references

### Omniclip — editor frontend core

- Repo: https://github.com/omni-media/omniclip
- Use for: timeline/clip editing concepts (trim, split, transitions, effects), undo/redo, project manager ideas, browser-first media pipeline thinking.
- Vokop mapping: implement in `apps/web/src/features/studio` + `useAppStore`; keep CapCut-style UI (menubar, tools rail, black shell).
- Do not: install Omniclip web components as the product UI or copy their visual system.

### Omnitool — browser video tools

- Package: `@omnimedia/omnitool` (https://github.com/omni-media/omnitool)
- Use for: client filmstrip, timeline build/playback/export (WebCodecs / mediabunny).
- Vokop mapping: `apps/web/src/features/studio/lib/omniTool/` (filmstrip fallback in `useVideoFilmstrip`).
- Server FFmpeg stays in `services/video-tools` — do not run Omnitool in Node.

### OpenCut — sample template (not shipped)

- `@templates/OpenCut/` is **reference sample code only** — patterns are ported into Vokop, not built from the template.
- **Frame time**: `@vokop/editor` `mediaTime.ts` — 120k ticks/sec, `snappedSeekSeconds`, `roundSecondsToFrame` (from OpenCut `time` crate).
- **Compositor JSON**: `apps/web/src/features/studio/lib/compositorFrameDescriptor.ts` — OpenCut-shaped `FrameDescriptor` for future WASM `renderFrame`.
- **Seek snap**: `useAppStore.seekTimeline` snaps to 30fps frames via `snappedSeekSeconds`.
- **Future**: wire `buildCompositorFrameDescriptor` → `opencut-wasm` when adding wgpu preview; keep Konva until then.

### Omniclip-aligned browser deps (web)

| Package | Role | Vokop path |
|---------|------|------------|
| `gl-transitions` | Live GLSL transition previews | `lib/glTransitions.ts`, `TransitionPreview` |
| `opfs-tools` | Persist media library in OPFS | `lib/opfsMediaCache.ts`, `hydrateMediaLibrary` |
| `coi-serviceworker` | COOP/COEP for ffmpeg.wasm | `public/coi-serviceworker.js` + Vite headers |

### FunClip — AI generate content service

- Repo: https://github.com/modelscope/FunClip
- Use for: ASR (Paraformer / Fun-ASR / SenseVoice concepts), timed segments + SRT, speaker diarization, hotwords, LLM-assisted clip ranges.
- Vokop mapping: `services/ai-content`, gateway `/api/v1/ai/*`, jobs + progress, studio panels consume results.
- Do not: ship Gradio as Vokop UI or block the monorepo on FunClip’s Python app process model.

### 302.AI — unified LLM gateway

- Site: https://302.ai/ · API docs: https://302ai-en.apifox.cn/
- Use for: one-key access to OpenAI/Anthropic/Gemini/China models via OpenAI-compatible `https://api.302.ai/v1`.
- Vokop mapping: provider id `302ai` in `services/ai-content/src/llm/providers/ai302.ts`.
- Requires account balance; smoke test fails with `Insufficient account balance` when empty.
