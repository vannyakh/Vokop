# Vokop Reference

## Ports

| Service | Port |
|---------|------|
| Web (Vite) | 3000 |
| Admin (Vite) | 3001 |
| Gateway | 4000 |
| Video-tools | 4001 |
| Auth | 4002 |
| AI content (planned) | 4003 |
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

### Planned AI content routes (`services/ai-content`, FunClip-inspired)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/ai/transcribe` | Start ASR job for a video session |
| GET | `/api/v1/ai/jobs/:jobId` | Job status + partial segments |
| POST | `/api/v1/ai/subtitles` | Build SRT / caption clips from segments |
| POST | `/api/v1/ai/clip-suggest` | LLM-assisted `[start,end]` suggestions |

Legacy (re-uploads file): `POST /api/v1/video/probe`, `POST /api/v1/video/filmstrip`

## Package responsibilities

| Package | Contains |
|---------|----------|
| `@vokop/shared` | `config/`, `constants/` (editor, aspect ratios), `types/`, `providers/` |
| `@vokop/api` | Zod schemas, `ApiClient`, `routes` |
| `@vokop/i18n` | Shared locale config + `createI18n` / `toI18nextResources` |
| `@vokop/ui` | Shared reusable UI primitives (`Button`, `LaunchButton`, …). Ant Design via `@vokop/ui/antd`. shadcn via `@vokop/ui/shadcn`. |
| `@vokop/db` | `connectDatabases`, Redis/Mongo helpers, graceful shutdown |

## Service responsibilities

| Service | Role |
|---------|------|
| `gateway` | Single API entry; proxies `/api/v1/*` |
| `video-tools` | FFmpeg sessions, filmstrip jobs, editor apply/preview |
| Web `@omnimedia/omnitool` | Browser video tools (filmstrip/timeline/export) via `apps/web/src/features/studio/lib/omniTool/` |
| `auth` | Auth, RBAC, projects CRUD |
| `ai-content` (planned) | FunClip-inspired ASR, subtitles, LLM clip assist |

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
GATEWAY_PORT, VIDEO_TOOLS_URL, AUTH_SERVICE_URL, WEB_ORIGIN
VIDEO_TOOLS_PORT, AUTH_PORT, AI_CONTENT_PORT (planned)
MAX_UPLOAD_MB, SESSION_TTL_SEC, MAX_FFMPEG_JOBS
GEMINI_API_KEY, VITE_PIXABAY_API_KEY, VITE_GIPHY_API_KEY
VITE_API_URL  # optional; dev uses Vite proxy
```

## Studio tool → implementation map

| Tool | UI | Server | Store key |
|------|-----|--------|-----------|
| Media | Pixabay, local upload, aspect ratio | session upload | aspectRatio |
| Text | TextTemplatesPanel, CanvasElementPanel | — | canvasElements |
| Audio | Waveform, mix presets | editor/apply | originalVolume, voiceVolume |
| Voice | Gemini TTS, speakers | — / future ai-content | audioBase64, speakerVoices |
| Captions | Caption style presets | editor/apply + future ai-content ASR | projectEditor.captionStyle |
| Effects | Effect presets + stickers | editor/preview | — |
| Transitions | Per-clip presets | editor/apply | projectEditor.clipEdits |
| Filters | Color presets | editor/preview | projectEditor.videoFilterId |
| AI clip (planned) | Studio AI panel | ai-content clip-suggest | timeline clips |

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

### FunClip — AI generate content service

- Repo: https://github.com/modelscope/FunClip
- Use for: ASR (Paraformer / Fun-ASR / SenseVoice concepts), timed segments + SRT, speaker diarization, hotwords, LLM-assisted clip ranges.
- Vokop mapping: new `services/ai-content`, gateway `/api/v1/ai/*`, jobs + progress, studio panels consume results.
- Do not: ship Gradio as Vokop UI or block the monorepo on FunClip’s Python app process model.
